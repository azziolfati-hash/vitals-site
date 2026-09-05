# /api — HANNCREST serverless functions

Vercel automatically deploys files in this folder as serverless functions (no build config needed).

## `report-bug.js`

The shared bug/feedback endpoint for every app (Breeze, Vitals, …). Apps POST JSON to
`https://hanncrest.com/api/report-bug`; it emails the report to the team.

**Subject line** (clear & scannable): `🐞 [Breeze] <first ~60 chars of the report> — v1.0.0`
(falls back to `🐞 [Breeze] Bug report — v1.0.0 (macOS 26.6)` when there's no description). The
`[AppName]` tag lets you filter by app.

### Turn on email delivery (one-time)
Sends via SMTP straight through hanncrest.com's own mailbox (Purelymail) — no third-party
sending service.
1. In the Vercel project → **Settings → Environment Variables**, add:
   - `SMTP_USER` — the mailbox to send as, e.g. `contact@hanncrest.com`
   - `SMTP_PASS` — that mailbox's password (or an app-specific password if 2FA is on)
   - *(optional)* `SMTP_HOST` — default `smtp.purelymail.com`
   - *(optional)* `SMTP_PORT` — default `465` (implicit TLS); use `587` for STARTTLS
   - *(optional)* `REPORT_TO_EMAIL` — comma-separated recipients (default: `SMTP_USER`)
   - *(optional)* `REPORT_FROM_EMAIL` — override the From header (default: `SMTP_USER` — most SMTP
     providers, Purelymail included, reject a From that isn't the authenticated mailbox or one of
     its aliases)
2. Redeploy. Done — reports now arrive as email, with the reporter's address as **Reply-To** when
   they gave one.

Until `SMTP_USER`/`SMTP_PASS` are set, the endpoint still returns `200` and logs the full report
to the Vercel **function logs**, so nothing is lost and the app's "Send Report" always succeeds.

### Test it
```bash
curl -s -X POST https://hanncrest.com/api/report-bug \
  -H 'Content-Type: application/json' \
  -d '{"app":"breeze","description":"Test report","appVersion":"1.0.0","osVersion":"macOS 26.6"}'
```
A working reply looks like `{"ok":true,"delivered":true}`. `{"ok":true,"delivered":false}` means
the report was logged but `SMTP_USER`/`SMTP_PASS` aren't set yet (see above) — check the Vercel
function logs for the full report text.

Reports can also carry `"kind":"feature"` (defaults to `"bug"`) and an `"attachments"` array of
`{url, filename}` — see below.

## `upload-token.js`

Lets an app upload bug-report attachments (screenshots, a zip) directly to Vercel Blob storage,
bypassing Vercel's ~4.5MB request-body limit — the client PUTs the raw file straight to Blob with
a plain `URLSession`/`fetch` request, no SDK needed. Client flow:
1. POST `{ filename, contentType, size }` to `https://hanncrest.com/api/upload-token`.
2. Get back `{ ok: true, presignedUrl, url }`.
3. `PUT` the file bytes to `presignedUrl` with the same `Content-Type`.
4. Send `{ url, filename }` in the report's `attachments` array to `/api/report-bug`.

Caps: 30MB per file, images (`png`/`jpeg`/`gif`/`webp`/`heic`) or `zip` only.

### Turn on attachment uploads (one-time)
In the Vercel project → **Storage** → **Create Database** → **Blob**. This auto-sets
`BLOB_READ_WRITE_TOKEN` for the project — no other config needed. Without it, `upload-token.js`
returns an error and the attachment is dropped, but the rest of the report still sends normally
(attachments are additive, never load-bearing for the report itself).

Blobs are uploaded **private**; `report-bug.js` mints a 7-day signed GET link per attachment when
it emails the report, so the link in the email works but the blob isn't otherwise public.
