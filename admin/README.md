# LeShelter Studio

Run `npm run admin`, then open **http://127.0.0.1:4173/admin/**. The first visit creates the Owner account. There are no default credentials. Use this server's website URL for previews; the old port-3000 static preview does not provide admin APIs.

## Implemented

- Server-authenticated Owner, Administrator, Editor and Viewer accounts. Owners can restrict individual users to content areas. Sessions are HttpOnly, SameSite=Strict, expire after eight hours, and are invalidated when access changes. Writes require both an exact same-origin request and a session CSRF token.
- An editor imported from all 12 current pages: editable text, destinations, image paths and descriptions; add, duplicate, reorder, hide and delete sections. Header and footer cannot be deleted or hidden. Undo is session-local; saved revisions and audit records persist.
- Draft and published previews at desktop, tablet and mobile widths. A sandboxed same-origin iframe displays the actual page with managed content applied; links and form actions are disabled in preview.
- Featured-event settings, carousel timing, product creation/removal, names, prices, descriptions, filter categories and product photos, media uploads/replacement, alt descriptions and folder labels, shared navigation, palette editing and contrast feedback.
- Save stores a private draft. Submit records a review request in the audit log. Owner/Administrator Publish writes `admin/content.js`, which the website loads. This updates the workspace; it does not deploy the site to a remote host. The current static hosting workflow can deploy the content file and uploaded assets alongside the site.
- PNG, JPEG and WebP uploads, checked by file signature, with a 5 MB size limit. Removing library entries retains original files. Referenced media must be replaced before removal.

## Data and deployment

Private users, salted scrypt password hashes, drafts, audit records and up to 30 revisions are stored in `.admin/state.json` (Git-ignored). Uploaded images live in `images/uploads/`. Back up both directories. Sessions are held in server memory and reset on restart. There is no password-recovery email flow.

The server intentionally listens only on **127.0.0.1**. It is a local management service, not an internet-ready deployment. The existing Vercel configuration is static and will not host this Node server. Online admin access needs persistent private storage, HTTPS with Secure cookies, deployment-specific origin handling, and a compatible authenticated backend host. Do not expose the raw development server to the internet.

The existing Google Sheets checkout endpoint remains in place. **Orders are not connected to this dashboard**; it displays an explicit empty integration state instead of inventing order records. New products receive stable IDs and appear in the existing three-column shop grid beside the cart. Product categories generate the shop filter tags automatically. Upload a PNG, JPEG or WebP directly from each product card, or choose an existing library image. New website pages still require extending the site templates/catalog import.

Some visual colours and structures are hardcoded in page-specific CSS; the Appearance panel changes shared theme variables, rather than rewriting every existing selector. Media folders are library metadata, not filesystem moves. Direct edits to site HTML after the one-time import are not automatically reimported.

## Validation

`node --test admin/server/server.test.mjs` tests authentication, server-side permissions, CSRF, optimistic draft revisions, unsafe-URL rejection, revision restore and publishing into an isolated temporary directory. It does not send orders or messages and does not publish test content into the website.

The Pages editor uses horizontal section tabs and a wider preview. Display text fields have whole-field font, color, size, alignment, bold, italic and underline controls. Reset restores the page styling. Formatting is saved with drafts, included in publishing and checked against the same area permissions as the text. URLs, image paths, alt descriptions and numeric settings retain plain controls.
`nFooter newsletter forms submit to POST /api/newsletter on the local server. Valid emails are stored privately in .admin/newsletter.json, with duplicate handling and rate limiting. Back up this file with other private data. This stores signups; it does not send campaigns. Static hosting needs a deployed subscription backend or newsletter-provider connection before online submissions will work. Run node --test admin/server/newsletter.test.mjs to check subscription validation and storage.
