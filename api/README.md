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
`{pathname, filename, size}` — see below.

## `upload-token.js`

Lets an app upload bug-report attachments (screenshots, a zip) directly to Vercel Blob storage,
bypassing Vercel's ~4.5MB request-body limit — the client PUTs the raw file straight to Blob with
a plain `URLSession`/`fetch` request, no SDK needed. Client flow:
1. POST `{ filename, contentType, size }` to `https://hanncrest.com/api/upload-token`.
2. Get back `{ ok: true, presignedUrl, pathname }`. `presignedUrl` is a one-time control-plane URL
   (not a per-object one — Blob's presigned PUT always works this way), so don't try to derive
   anything from it; `pathname` is the durable identifier to hang onto.
3. `PUT` the file bytes to `presignedUrl` with the same `Content-Type`.
4. Send `{ pathname, filename, size }` in the report's `attachments` array to `/api/report-bug`.

The upload is requested with `addRandomSuffix: false`, so `pathname` is exactly what was asked
for (`bug-reports/<reportId>/<filename>`, already unique per report) — no random suffix to lose
track of. `allowOverwrite: true` lets a retry of the same report reuse the same pathname safely.

Caps: 15MB per file (also the combined cap `report-bug.js` enforces — see below), images
(`png`/`jpeg`/`gif`/`webp`/`heic`) or `zip` only.

### Turn on attachment uploads (one-time)
In the Vercel project → **Storage** → **Create Database** → **Blob**. This auto-sets
`BLOB_READ_WRITE_TOKEN` for the project — no other config needed. Without it, `upload-token.js`
returns an error and the attachment is dropped, but the rest of the report still sends normally
(attachments are additive, never load-bearing for the report itself).

### Blob is a relay, not the delivery mechanism
Blobs are uploaded **private** and are short-lived. `report-bug.js` doesn't link to them — it
fetches each one's bytes back out (a signed GET valid for 5 minutes, just long enough for that one
fetch) and attaches the real file to the outgoing email via nodemailer, then **deletes the blob**
whether the email succeeds or not. The recipient gets a normal email attachment, never a link, and
nothing is left sitting in Blob storage afterward.

Why Blob is involved at all: Vercel Functions hard-cap the request body at **4.5MB**, enforced at
the infrastructure level — not configurable via `vercel.json` or anything else. A 15MB screenshot
can never ride in the same POST as the report text, so the client PUTs it straight to Blob (which
has no such limit) and only the pathname travels through `/api/report-bug`. `report-bug.js` caps
the *combined* attachment size it will actually email at 15MB (`MAX_EMAIL_ATTACHMENT_BYTES`) —
comfortably under a 30MB inbox limit once base64 MIME encoding inflates it by ~37% — and drops
(logs, doesn't fail the report) anything that would push it over.
