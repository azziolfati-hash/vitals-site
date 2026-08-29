// Shared bug/feedback endpoint for the HANNCREST apps (Breeze, Vitals, …).
//
// Every app POSTs the same JSON here; the `app` field tags which one. This emails the report to
// the team via Resend (https://resend.com) — a good fit for a domain already on Vercel.
//
// Setup (one-time, in the Vercel project settings → Environment Variables):
//   • RESEND_API_KEY   — your Resend API key
//   • (optional) REPORT_TO_EMAIL   — override the recipient (defaults to contact@hanncrest.com)
//   • (optional) REPORT_FROM_EMAIL — verified Resend sender (defaults to reports@hanncrest.com)
// You must also verify the sending domain (hanncrest.com) in Resend so the "from" address is allowed.
//
// Without RESEND_API_KEY set, the endpoint still returns 200 and logs the full report to the Vercel
// function logs, so nothing is lost and the app's "Send Report" never errors while you finish setup.

const TO_ADDRESS = process.env.REPORT_TO_EMAIL || 'contact@hanncrest.com';
const FROM_ADDRESS = process.env.REPORT_FROM_EMAIL || 'HANNCREST Reports <reports@hanncrest.com>';

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

  // --- Clear, scannable subject ------------------------------------------------------------
  const snippet = shortDesc(description);
  const subject = snippet
    ? `🐞 [${app}] ${snippet} — v${version}`
    : `🐞 [${app}] Bug report — v${version} (${os})`;

  // --- Plain-text body ---------------------------------------------------------------------
  const lines = [
    `New bug report from ${app}`,
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
    <h2 style="margin:0 0 4px">🐞 ${esc(app)} bug report</h2>
    <div style="color:#6b7078;font-size:13px">v${esc(version)} (build ${esc(build)}) · ${esc(os)} · consent: ${esc(consent)}</div>
    <table style="margin:14px 0;border-collapse:collapse;font-size:13px">
      <tr><td style="color:#6b7078;padding:2px 12px 2px 0">From</td><td>${email ? esc(email) : '<i>anonymous</i>'}</td></tr>
      <tr><td style="color:#6b7078;padding:2px 12px 2px 0">Report ID</td><td>${esc(reportId)}</td></tr>
      <tr><td style="color:#6b7078;padding:2px 12px 2px 0">Received</td><td>${esc(createdAt)}</td></tr>
    </table>
    <h3 style="margin:16px 0 6px">What happened</h3>
    <div style="white-space:pre-wrap;background:#f6f6f9;border-radius:8px;padding:12px">${esc(description)}</div>
    ${d ? `<h3 style="margin:16px 0 6px">Diagnostics <span style="font-weight:400;color:#6b7078">(anonymous, opt-in)</span></h3>
    <table style="border-collapse:collapse;font-size:13px">
      <tr><td style="color:#6b7078;padding:2px 12px 2px 0">Mac</td><td>${esc(d.deviceModel)} (${esc(d.architecture)})</td></tr>
      <tr><td style="color:#6b7078;padding:2px 12px 2px 0">CPU / RAM</td><td>${esc(d.cpuCores)} cores · ${esc(d.memoryGB)} GB</td></tr>
      <tr><td style="color:#6b7078;padding:2px 12px 2px 0">Locale</td><td>${esc(d.locale)} · ${esc(d.timeZone)}</td></tr>
      <tr><td style="color:#6b7078;padding:2px 12px 2px 0">Uptime</td><td>${esc(d.uptimeHours)} h · Thermal: ${esc(d.thermalState)}</td></tr>
      <tr><td style="color:#6b7078;padding:2px 12px 2px 0">Status</td><td>${esc(d.proStatus)}</td></tr>
    </table>` : ''}
  </div>`;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log('[report-bug] (RESEND_API_KEY not set) subject:', subject, '\n', text);
    return res.status(200).json({ ok: true, delivered: false, note: 'Logged; email not configured yet.' });
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [TO_ADDRESS],
        subject,
        text,
        html,
        reply_to: email || undefined,
      }),
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error('[report-bug] Resend error', r.status, detail);
      return res.status(502).json({ ok: false, error: 'Email delivery failed.' });
    }
    return res.status(200).json({ ok: true, delivered: true });
  } catch (e) {
    console.error('[report-bug] exception', e);
    return res.status(500).json({ ok: false, error: 'Server error.' });
  }
};
