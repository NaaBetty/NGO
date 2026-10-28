-- Run once in the linked Supabase project's SQL Editor.
begin;
create table public.membership_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.membership_admins enable row level security;
revoke all on public.membership_admins from anon, authenticated;

create function public.is_membership_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.membership_admins where user_id = auth.uid());
$$;
revoke all on function public.is_membership_admin() from public;
grant execute on function public.is_membership_admin() to authenticated;

create table public.ngo_members (
 id uuid primary key default gen_random_uuid(),
 member_number text unique not null check(length(member_number) between 1 and 40),
 full_name text not null check(length(full_name) between 1 and 120),
 member_role text not null check(length(member_role) between 1 and 80),
 issued_on date not null default current_date,
 expires_on date not null check(expires_on >= issued_on),
 status text not null default 'Active' check(status in ('Active','Revoked')),
 verification_token text unique not null default replace(gen_random_uuid()::text || gen_random_uuid()::text,'-',''),
 created_at timestamptz not null default now()
);
alter table public.ngo_members enable row level security;
revoke all on public.ngo_members from anon, authenticated;
grant select, insert on public.ngo_members to authenticated;
grant update (full_name,member_role,expires_on,status) on public.ngo_members to authenticated;
create policy membership_admin_access on public.ngo_members for all to authenticated
 using(public.is_membership_admin()) with check(public.is_membership_admin());

create table public.membership_audit (
 id bigint generated always as identity primary key,
 member_id uuid not null,
 actor uuid,
 action text not null,
 occurred_at timestamptz not null default now()
);
alter table public.membership_audit enable row level security;
revoke all on public.membership_audit from anon, authenticated;
grant select on public.membership_audit to authenticated;
create policy membership_admin_audit on public.membership_audit for select to authenticated using(public.is_membership_admin());
create function public.audit_membership_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.membership_audit(member_id,actor,action) values(new.id,auth.uid(),tg_op);
 return new;
end; $$;
revoke all on function public.audit_membership_change() from public;
create trigger membership_changes after insert or update on public.ngo_members
 for each row execute function public.audit_membership_change();

create function public.create_ngo_member(details jsonb) returns public.ngo_members
language plpgsql security invoker set search_path='' as $$
declare member public.ngo_members;
begin
 insert into public.ngo_members(member_number,full_name,member_role,expires_on)
 values(details->>'member_number',details->>'full_name',details->>'member_role',(details->>'expires_on')::date)
 returning * into member;
 return member;
end; $$;
revoke all on function public.create_ngo_member(jsonb) from public;
grant execute on function public.create_ngo_member(jsonb) to authenticated;

-- This is the ONLY anonymous read path. It does not expose a directory or tokens.
create function public.verify_ngo_member(token text)
returns table(member_number text,full_name text,member_role text,issued_on date,expires_on date,status text)
language sql stable security definer set search_path='' as $$
 select m.member_number,m.full_name,m.member_role,m.issued_on,m.expires_on,
 case when m.status='Revoked' then 'Revoked' when m.expires_on<current_date then 'Expired' else 'Active' end
 from public.ngo_members m
 where length(token)=64 and m.verification_token=token limit 1;
$$;
revoke all on function public.verify_ngo_member(text) from public;
grant execute on function public.verify_ngo_member(text) to anon,authenticated;
commit;
