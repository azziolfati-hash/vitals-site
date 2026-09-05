// Vercel Serverless Function — POST /api/upload-token
//
// Mints a short-lived, single-file presigned PUT URL so a bug-report attachment can go
// straight from the client to Vercel Blob storage without passing through this function's
// body — Vercel Functions cap request bodies at 4.5MB (a hard infrastructure limit, not
// configurable), so this is the only way to move an attachment of any real size at all.
// The client (see Sources/Vitals/BugReport.swift) POSTs the file's name/type/size here, gets
// back { presignedUrl }, then does a plain HTTP PUT of the file bytes straight to that URL.
// No @vercel/blob client needed on the Swift side — presigned URLs are HMAC-signed and
// fetchable with any HTTP client.
//
// Blobs are stored PRIVATE and are short-lived: report-bug.js fetches each one's bytes back
// out and attaches them directly to the outgoing email (a real attachment, not a link), then
// deletes the blob immediately. Blob storage here is purely a relay to get past the 4.5MB
// wall above — nothing durable, and never what the email recipient sees.
//
// Setup: same Vercel project as report-bug.js. Create a Blob store (Project → Storage →
// Create Database → Blob) — this sets BLOB_READ_WRITE_TOKEN automatically. No extra env vars.

const { issueSignedToken, presignUrl } = require('@vercel/blob');

// 15MB, not 30MB: this becomes a real email attachment, base64-encoded in transit (~37%
// larger) on top of whatever else is in the message — has to clear the recipient's inbox cap,
// not just get past this upload step. Matches the client-side cap in BugReportView.
const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
  'application/zip', 'application/x-zip-compressed',
];

function safeName(name) {
  const base = String(name || 'attachment').split(/[\\/]/).pop().slice(-120);
  return base.replace(/[^A-Za-z0-9._-]/g, '_') || 'attachment';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== 'object') body = {};

  const filename = safeName(body.filename);
  const contentType = String(body.contentType || 'application/octet-stream');
  const size = Number(body.size) || 0;
  const reportId = String(body.reportId || Date.now()).replace(/[^A-Za-z0-9-]/g, '').slice(0, 60) || 'report';

  if (!ALLOWED_TYPES.includes(contentType)) {
    return res.status(415).json({ error: 'Unsupported attachment type. Send images or a .zip.' });
  }
  if (size <= 0 || size > MAX_BYTES) {
    return res.status(413).json({ error: 'Attachment must be under 15MB.' });
  }

  const pathname = `bug-reports/${reportId}/${filename}`;

  try {
    const token = await issueSignedToken({
      pathname,
      operations: ['put'],
      allowedContentTypes: [contentType],
      maximumSizeInBytes: MAX_BYTES,
      validUntil: Date.now() + 15 * 60 * 1000, // 15 minutes to complete the upload
    });

    const { presignedUrl } = await presignUrl(token, {
      operation: 'put',
      pathname,
      access: 'private',
      allowedContentTypes: [contentType],
      maximumSizeInBytes: MAX_BYTES,
      addRandomSuffix: true,
      cacheControlMaxAge: 60 * 60, // reports are read once, shortly after upload
    });

    // The presigned URL is the pathname (with the random suffix already applied) plus
    // signing query params — stripping the query string gives the durable blob pathname
    // report-bug.js needs later to mint its own short-lived GET link.
    const url = presignedUrl.split('?')[0];

    return res.status(200).json({ ok: true, presignedUrl, url });
  } catch (err) {
    console.error('upload-token: failed —', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Could not prepare the upload.' });
  }
};
