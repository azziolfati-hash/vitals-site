// Shared bug/feedback endpoint for the HANNCREST apps (Breeze, Vitals, …).
//
// Every app POSTs the same JSON here; the `app` field tags which one. This emails the report
// straight through hanncrest.com's own mailbox (Purelymail) via SMTP — no third-party sending
// service in the middle.
//
// Setup (one-time, in the Vercel project settings → Environment Variables):
//   • SMTP_USER — the full mailbox address to send as/from, e.g. contact@hanncrest.com
//   • SMTP_PASS — that mailbox's password, or an app-specific password if 2FA is on
//   • (optional) SMTP_HOST — defaults to smtp.purelymail.com
//   • (optional) SMTP_PORT — defaults to 465 (implicit TLS); use 587 for STARTTLS
//   • (optional) REPORT_TO_EMAIL   — override the recipient(s) (defaults to SMTP_USER)
//   • (optional) REPORT_FROM_EMAIL — override the From header (defaults to SMTP_USER — most SMTP
//     providers, Purelymail included, reject a From that isn't the authenticated mailbox or one
//     of its configured aliases)
//
// Without SMTP_USER/SMTP_PASS set, the endpoint still returns 200 and logs the full report to the
// Vercel function logs, so nothing is lost and the app's "Send Report" never errors while you
// finish setup.
//
// Attachments (screenshots / a zip, up to 15MB total) are uploaded straight to Vercel Blob by the
// client beforehand (see api/upload-token.js) — bypassing Vercel's 4.5MB function request-body
// limit, which is hard-enforced infrastructure-side and not configurable. This endpoint only
// receives their blob pathnames, but the *email* gets the real files: it fetches each blob's
// bytes back out and attaches them directly (nodemailer `attachments`), then deletes the blob.
// Blob storage here is purely a relay for getting bytes past the 4.5MB wall — never what the
// recipient sees, and nothing durable is left behind once the email is sent.

const { issueSignedToken, presignUrl, del } = require('@vercel/blob');
const nodemailer = require('nodemailer');

// Keeps the final email comfortably under typical inbox caps (e.g. a 30MB limit) once
// base64 MIME encoding inflates attachment bytes by ~37%.
const MAX_EMAIL_ATTACHMENT_BYTES = 15 * 1024 * 1024;

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.purelymail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

// Recipients default to the mailbox we're sending from — the report just lands in the inbox
// you're already sending it out of. Override with a comma-separated REPORT_TO_EMAIL.
const TO_ADDRESSES = (process.env.REPORT_TO_EMAIL || SMTP_USER || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
const FROM_ADDRESS = process.env.REPORT_FROM_EMAIL || SMTP_USER;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function appLabel(tag) {
  const map = { breeze: 'Breeze', vitals: 'Vitals', stealthshare: 'StealthShare', aura: 'Aura', whispertype: 'WhisperType' };
  return map[String(tag || '').toLowerCase()] || (tag ? String(tag) : 'App');
}

function shortDesc(desc) {
  const oneLine = String(desc || '').replace(/\s+/g, ' ').trim();
  if (!oneLine) return '';
  return oneLine.length > 60 ? oneLine.slice(0, 57) + '…' : oneLine;
}

// "bug" (default) or "feature" — anything else falls back to "bug" rather than erroring, since
// this field only changes wording, never validation.
function kindInfo(raw) {
  if (String(raw || '').toLowerCase() === 'feature') {
    return { kind: 'feature', emoji: '💡', noun: 'feature request', verb: 'requested' };
  }
  return { kind: 'bug', emoji: '🐞', noun: 'bug report', verb: 'reported' };
}

// Filenames only, no fetch — cheap enough to compute unconditionally so the report text/log
// can mention what was attached even when email isn't configured yet (see below).
function attachmentNames(attachments) {
  const list = Array.isArray(attachments) ? attachments.slice(0, 10) : [];
  return list.map((a) => String((a && a.filename) || 'attachment'));
}

function pathnameOf(attachment) {
  const p = attachment && typeof attachment === 'object' ? String(attachment.pathname || '') : '';
  return p || null;
}

// Downloads each attachment's bytes out of Blob (a short-lived signed GET, same mechanism as
// the upload side) so they can be attached to the email directly. Best-effort per file and
// against the combined size cap: one bad pathname, a Blob hiccup, or a file that would push the
// message over the cap drops just that attachment rather than failing the whole report — the
// report itself is never worth losing over one broken attachment. Every pathname we touch
// (attached or not) is returned so the caller can still delete it.
async function fetchAttachmentBuffers(attachments) {
  const list = Array.isArray(attachments) ? attachments.slice(0, 10) : [];
  const files = [];
  const pathnames = [];
  let total = 0;
  for (const a of list) {
    const pathname = pathnameOf(a);
    if (!pathname) continue;
    pathnames.push(pathname);
    const filename = String((a && a.filename) || pathname.split('/').pop());
    try {
      const token = await issueSignedToken({
        pathname,
        operations: ['get'],
        validUntil: Date.now() + 5 * 60 * 1000, // only needs to survive one fetch, right now
      });
      const { presignedUrl } = await presignUrl(token, { operation: 'get', pathname, access: 'private' });
      const dl = await fetch(presignedUrl);
      if (!dl.ok) throw new Error(`fetch returned ${dl.status}`);
      const buf = Buffer.from(await dl.arrayBuffer());
      if (total + buf.length > MAX_EMAIL_ATTACHMENT_BYTES) {
        console.error(`report-bug: dropping ${filename} — would push attachments over the ${MAX_EMAIL_ATTACHMENT_BYTES}-byte cap`);
        continue;
      }
      total += buf.length;
      files.push({ filename, content: buf });
    } catch (err) {
      console.error('report-bug: could not fetch attachment —', err && err.message ? err.message : err);
    }
  }
  return { files, pathnames };
}

// The blob only ever exists to ferry bytes from the client to this function — once the email
// has been sent (or we've given up trying), there's nothing left to keep it around for.
async function cleanupBlobs(pathnames) {
  await Promise.all(pathnames.map((p) =>
    del(p).catch((err) => console.error('report-bug: could not delete blob', p, '—', err && err.message ? err.message : err))));
}

module.exports = async (req, res) => {
  // CORS — harmless for the native apps; lets a browser call it too if ever needed.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true, service: 'HANNCREST bug reports' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== 'object') body = {};

  const description = String(body.description || '').trim();
  if (!description) return res.status(400).json({ error: 'A description is required.' });

  const app = appLabel(body.app);
  const version = String(body.appVersion || '?');
  const build = String(body.appBuild || '?');
  const os = String(body.osVersion || 'macOS');
  const email = String(body.email || '').trim();
  const consent = String(body.consentLevel || 'basic');
  const reportId = String(body.reportId || '');
  const createdAt = String(body.createdAt || new Date().toISOString());
  const d = body.diagnostics && typeof body.diagnostics === 'object' ? body.diagnostics : null;
  const { emoji, noun } = kindInfo(body.kind);
  const names = attachmentNames(body.attachments);

  // --- Clear, scannable subject ------------------------------------------------------------
  const snippet = shortDesc(description);
  const subject = snippet
    ? `${emoji} [${app}] ${snippet} — v${version}`
    : `${emoji} [${app}] ${noun[0].toUpperCase()}${noun.slice(1)} — v${version} (${os})`;

  // --- Plain-text body ---------------------------------------------------------------------
  const lines = [
    `New ${noun} from ${app}`,
    ``,
    `From:      ${email || 'anonymous (no email given)'}`,
    `App:       ${app}  v${version} (build ${build})`,
    `System:    ${os}`,
    `Consent:   ${consent}`,
    `Report ID: ${reportId}`,
    `Received:  ${createdAt}`,
    ``,
    `What happened`,
    `-------------`,
    description,
  ];
  if (names.length) {
    lines.push(``, `Attachments`, `-----------`, ...names);
  }
  if (d) {
    lines.push(
      ``, `Diagnostics (anonymous, opt-in)`, `-------------------------------`,
      `Mac:     ${d.deviceModel || '?'} (${d.architecture || '?'})`,
      `CPU/RAM: ${d.cpuCores ?? '?'} cores · ${d.memoryGB ?? '?'} GB`,
      `Locale:  ${d.locale || '?'} · ${d.timeZone || '?'}`,
      `Uptime:  ${d.uptimeHours ?? '?'} h · Thermal: ${d.thermalState || '?'}`,
      `Status:  ${d.proStatus || '?'}`,
    );
  }
  const text = lines.join('\n');

  // --- HTML body ---------------------------------------------------------------------------
  const html = `<div style="font:14px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#15151b">
    <h2 style="margin:0 0 4px">${emoji} ${esc(app)} ${esc(noun)}</h2>
    <div style="color:#6b7078;font-size:13px">v${esc(version)} (build ${esc(build)}) · ${esc(os)} · consent: ${esc(consent)}</div>
    <table style="margin:14px 0;border-collapse:collapse;font-size:13px">
      <tr><td style="color:#6b7078;padding:2px 12px 2px 0">From</td><td>${email ? esc(email) : '<i>anonymous</i>'}</td></tr>
      <tr><td style="color:#6b7078;padding:2px 12px 2px 0">Report ID</td><td>${esc(reportId)}</td></tr>
      <tr><td style="color:#6b7078;padding:2px 12px 2px 0">Received</td><td>${esc(createdAt)}</td></tr>
    </table>
    <h3 style="margin:16px 0 6px">What happened</h3>
    <div style="white-space:pre-wrap;background:#f6f6f9;border-radius:8px;padding:12px">${esc(description)}</div>
    ${names.length ? `<h3 style="margin:16px 0 6px">Attachments</h3>
    <div style="color:#15151b">${names.map(esc).join('<br>')}</div>` : ''}
    ${d ? `<h3 style="margin:16px 0 6px">Diagnostics <span style="font-weight:400;color:#6b7078">(anonymous, opt-in)</span></h3>
    <table style="border-collapse:collapse;font-size:13px">
      <tr><td style="color:#6b7078;padding:2px 12px 2px 0">Mac</td><td>${esc(d.deviceModel)} (${esc(d.architecture)})</td></tr>
      <tr><td style="color:#6b7078;padding:2px 12px 2px 0">CPU / RAM</td><td>${esc(d.cpuCores)} cores · ${esc(d.memoryGB)} GB</td></tr>
      <tr><td style="color:#6b7078;padding:2px 12px 2px 0">Locale</td><td>${esc(d.locale)} · ${esc(d.timeZone)}</td></tr>
      <tr><td style="color:#6b7078;padding:2px 12px 2px 0">Uptime</td><td>${esc(d.uptimeHours)} h · Thermal: ${esc(d.thermalState)}</td></tr>
      <tr><td style="color:#6b7078;padding:2px 12px 2px 0">Status</td><td>${esc(d.proStatus)}</td></tr>
    </table>` : ''}
  </div>`;

  if (!SMTP_USER || !SMTP_PASS) {
    console.log('[report-bug] (SMTP_USER/SMTP_PASS not set) subject:', subject, '\n', text);
    // Nothing will ever fetch these blobs now — clean them up rather than leaving them to
    // accumulate in storage indefinitely.
    await cleanupBlobs((Array.isArray(body.attachments) ? body.attachments : []).map(pathnameOf).filter(Boolean));
    return res.status(200).json({ ok: true, delivered: false, note: 'Logged; email not configured yet.' });
  }

  const { files, pathnames } = await fetchAttachmentBuffers(body.attachments);

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,   // implicit TLS on 465; STARTTLS is negotiated automatically on 587
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: TO_ADDRESSES,
      subject,
      text,
      html,
      replyTo: email || undefined,
      attachments: files,
    });
    return res.status(200).json({ ok: true, delivered: true });
  } catch (e) {
    console.error('[report-bug] SMTP error', e && e.message ? e.message : e);
    return res.status(502).json({ ok: false, error: 'Email delivery failed.' });
  } finally {
    await cleanupBlobs(pathnames);
  }
};
