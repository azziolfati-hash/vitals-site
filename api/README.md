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
