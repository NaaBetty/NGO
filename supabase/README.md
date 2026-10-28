# Supabase membership integration

Project: https://iewrvbzgygmpcrlaqsaq.supabase.co
Only the public publishable key is used in Javascript/membership-client.js. No secret/service_role key is needed in the website.

## Finish activation
1. Open the Supabase SQL Editor for this project. Run `supabase/migrations/202610280001_memberships.sql` once. This creates new membership tables, database permissions, verification functions and an audit log; it does not migrate or replace the existing CMS.
2. In Authentication > Users, create the membership administrator account using a strong password. Confirm that account's email. Disable public account sign-up if this project is only for invited administrators.
3. Copy that user's UUID and run this in SQL Editor (replace the placeholder):

```sql
insert into public.membership_admins(user_id) values ('YOUR_AUTH_USER_UUID');
```

Only project owners with SQL access grant membership administrator access. New Auth accounts have NO membership access by default. Existing local dashboard roles do not automatically carry over.
4. Serve the website with `npm run admin`, then open http://127.0.0.1:4173/admin/members.html. Sign in with the Supabase account. The existing dashboard also has a Members & IDs link.
5. Create a member, open View ID, then open its verification link in a signed-out browser. Confirm Active status; revoke it and confirm Revoked status. Check that a non-authorized Supabase account cannot list or edit members, and an anonymous request cannot list ngo_members.
6. Deploy the new files and updated CSP configuration to your website hosting. Create IDs from the production site so verification links use the official domain, rather than localhost.

## Included
- Supabase password authentication (access token kept in memory, not localStorage; reload requires sign-in).
- Administrator-only member creation, listing, editing, renewal and revocation, enforced by Postgres RLS and grants.
- Printable ID with verification link and random 64-character code.
- Public verify.html page reads ONLY name, member number, role, issue/expiry dates and current status via a narrowly scoped database function.
- Database audit entries for member inserts and updates; no member deletion in this UI.
- Tokens in URL fragments avoid sending codes to the website host in URL requests. Anyone with a code can view the listed verification details; inform members of this before issuance.

## QR images and member photos
ID cards include a locally generated QR PNG encoding the official verification URL (no third-party QR service). View ID offers Download QR image and Print / Save PDF. The canonical URL is set in `Javascript/membership-client.js`.

After migration 002, member cards have Upload / replace photo. PNG/JPEG/WebP photos up to 5 MB upload directly to the private member-photos bucket. Administrators receive temporary signed links. Public verification checks the code and gets a short-lived signed photo link through `/api/member-photo`; anonymous users cannot browse the photo bucket.

## Migrate the full existing website CMS
1. Run `supabase/migrations/202610280002_cms_and_photos.sql` in SQL Editor, after migration 001. Run each migration once.
2. Copy `.env.example` to `.env` if needed. Set SUPABASE_URL and SUPABASE_SECRET_KEY there. Keep CMS_STORAGE unset/local until import completes. Never commit the secret or paste it in chat.
3. Stop the local management server and pause other editors so no changes occur during import.
4. Run `npm run migrate:cms`. This imports the current `.admin/state.json` (existing local accounts and password hashes, permissions, draft, published content, history and audit), copies images/uploads to Supabase Storage and rewrites their references, and imports newsletter subscribers. It refuses to replace an existing cloud CMS and retains private local backups. Review remote imports before enabling cloud mode. Existing Supabase membership Auth accounts remain separate from the preserved website CMS accounts.
5. Set CMS_STORAGE=supabase in `.env` and restart `npm run admin`. The same website CMS accounts should work. Save and publish a draft, reload the public page, and verify it updates. Concurrent writes use a database version check and reject stale saves. Sessions and newsletter subscriptions also persist in Supabase; no runtime writes to website files are needed.
6. Once cloud mode is active, use it on all CMS instances. Do not continue editing the old file-backed version. Keep backups until migration is verified.

Supabase stores the complete existing CMS as a private, versioned JSON document, rather than converting each field to a separate table. This preserves the current editor and existing account system. The secret key is used only by the Node backend; anonymous users can read only the published content document. Local static media already tracked in images/ remains in the website build; dynamically uploaded images move to Storage. CMS media uploads in cloud mode are limited to 3 MB to fit Vercel request limits.

## Deploy to the existing Vercel project
1. Run `npx vercel login`, then `npx vercel link` in this workspace and select the existing project. No new site or project is needed.
2. In the Vercel project, configure SUPABASE_URL, SUPABASE_SECRET_KEY, CMS_STORAGE=supabase and SITE_URL=https://www.leshelterfoundation.org for Production. Use the actual production origin if different. For Preview deployments use that deployment's origin for SITE_URL (same-origin write checks use it); never point an untrusted preview at production CMS data.
3. Apply migrations and run the import before deploying. Missing cloud setup fails closed; it does not expose initial-owner registration on production.
4. Run `npm run build` and tests, then `npx vercel --prod`. The public output is dist/. Private `.admin`, `.env`, server source, seed and SQL files are excluded from public assets. The Node function bundles the required private server files separately. Do not upload the entire source folder as a static website.
5. Test membership login, image upload, ID printing and QR scanning; then website CMS login, draft/preview, publish, media upload, revision restore, permissions, newsletter signup and logout on the production domain. No email campaigns or payment processing are added by this migration.

The public website loads the latest published CMS document from Supabase and keeps the bundled published content as an outage fallback. Publish a saved draft before expecting public changes. The member verification token identifies a record; it is not proof that the person presenting the card owns that identity. Collect consent for displaying names and photos via verification links.

## Validation commands
- `npm run test:cloud`: QR scan decoding, access control, cloud revision conflicts, login/session persistence, newsletter behavior and security headers. Uses a mock cloud store for repeatable tests.
- `npm run check:cloud`: read-only live Supabase readiness check without displaying secrets or personal records.
- `npm run build`: public deployment output.

The older `admin/server/server.test.mjs` page-field inventory check currently reports stale source markers from prior page edits (including the removed About caption). This does not replace live production acceptance testing.
