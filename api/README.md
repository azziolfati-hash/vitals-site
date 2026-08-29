# /api — HANNCREST serverless functions

Vercel automatically deploys files in this folder as serverless functions (no build config needed).

## `report-bug.js`

The shared bug/feedback endpoint for every app (Breeze, Vitals, …). Apps POST JSON to
`https://hanncrest.com/api/report-bug`; it emails the report to the team.

**Subject line** (clear & scannable): `🐞 [Breeze] <first ~60 chars of the report> — v1.0.0`
(falls back to `🐞 [Breeze] Bug report — v1.0.0 (macOS 26.6)` when there's no description). The
`[AppName]` tag lets you filter by app.

### Turn on email delivery (one-time)
1. Create a [Resend](https://resend.com) account and **verify the `hanncrest.com` domain** in it.
2. In the Vercel project → **Settings → Environment Variables**, add:
   - `RESEND_API_KEY` — your Resend API key
   - *(optional)* `REPORT_TO_EMAIL` — recipient (default `contact@hanncrest.com`)
   - *(optional)* `REPORT_FROM_EMAIL` — verified sender (default `HANNCREST Reports <reports@hanncrest.com>`)
3. Redeploy. Done — reports now arrive as email, with the reporter's address as **Reply-To** when they gave one.

Until `RESEND_API_KEY` is set, the endpoint still returns `200` and logs the full report to the
Vercel **function logs**, so nothing is lost and the app's "Send Report" always succeeds.

### Test it
```bash
curl -s -X POST https://hanncrest.com/api/report-bug \
  -H 'Content-Type: application/json' \
  -d '{"app":"breeze","description":"Test report","appVersion":"1.0.0","osVersion":"macOS 26.6"}'
```
