begin;
-- All existing CMS records stay private, including legacy password hashes and sessions.
create table public.cms_store(id text primary key check(id='main'), version bigint not null default 0,payload jsonb not null);
alter table public.cms_store enable row level security;
revoke all on public.cms_store from anon,authenticated;
grant all on public.cms_store to service_role;
create table public.cms_published(id text primary key check(id='main'),content jsonb not null);
alter table public.cms_published enable row level security;
revoke all on public.cms_published from anon,authenticated;
grant select on public.cms_published to anon,authenticated;
grant all on public.cms_published to service_role;
create policy public_published_content on public.cms_published for select to anon,authenticated using(id='main');
create function public.cms_initialize(initial_payload jsonb) returns bigint
language plpgsql security invoker set search_path='' as $$
begin
 insert into public.cms_store values('main',0,initial_payload);
 insert into public.cms_published values('main',initial_payload->'published');
 return 0;
end; $$;
create function public.cms_commit(expected_version bigint,new_payload jsonb) returns bigint
language plpgsql security invoker set search_path='' as $$
declare new_version bigint;
begin
 update public.cms_store set payload=new_payload,version=version+1 where id='main' and version=expected_version returning version into new_version;
 if new_version is null then raise exception 'Concurrent update; reload and retry.'; end if;
 insert into public.cms_published values('main',new_payload->'published') on conflict(id) do update set content=excluded.content;
 return new_version;
end; $$;
revoke all on function public.cms_initialize(jsonb),public.cms_commit(bigint,jsonb) from public,anon,authenticated;
grant execute on function public.cms_initialize(jsonb),public.cms_commit(bigint,jsonb) to service_role;

create table public.newsletter_subscribers(email text primary key check(length(email)<=254),created_at timestamptz not null default now());
alter table public.newsletter_subscribers enable row level security;
revoke all on public.newsletter_subscribers from anon,authenticated;
grant all on public.newsletter_subscribers to service_role;

create table public.cms_rate_limits(key text primary key,window_start timestamptz not null,hits integer not null);
alter table public.cms_rate_limits enable row level security;
revoke all on public.cms_rate_limits from anon,authenticated;
grant all on public.cms_rate_limits to service_role;
create function public.cms_rate_limit(request_key text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare count_hits integer;
begin
 delete from public.cms_rate_limits where window_start<now()-interval '1 day';
 insert into public.cms_rate_limits as limits values(request_key,now(),1)
 on conflict(key) do update set hits=case when limits.window_start<now()-interval '1 minute' then 1 else limits.hits+1 end,
 window_start=case when limits.window_start<now()-interval '1 minute' then now() else limits.window_start end returning hits into count_hits;
 return count_hits<=10;
end; $$;
revoke all on function public.cms_rate_limit(text) from public,anon,authenticated;
grant execute on function public.cms_rate_limit(text) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cms-media','cms-media',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
-- CMS uploads are exclusively through the existing authenticated Node endpoint.

alter table public.ngo_members add column photo_path text check(photo_path is null or photo_path ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$');
grant update(photo_path) on public.ngo_members to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('member-photos','member-photos',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy member_photo_insert on storage.objects for insert to authenticated with check(bucket_id='member-photos' and public.is_membership_admin());
create policy member_photo_read on storage.objects for select to authenticated using(bucket_id='member-photos' and public.is_membership_admin());
create policy member_photo_delete on storage.objects for delete to authenticated using(bucket_id='member-photos' and public.is_membership_admin());
create function public.get_member_photo(token text) returns text
language sql stable security definer set search_path='' as $$
 select m.photo_path from public.ngo_members m where length(token)=64 and m.verification_token=token limit 1;
$$;
revoke all on function public.get_member_photo(text) from public;
grant execute on function public.get_member_photo(text) to service_role;
commit;
