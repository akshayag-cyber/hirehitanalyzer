// ─────────────────────────────────────────────────────────────────────────────
// Google Drive upload service
//
// Authenticates with a Service Account JSON key (path supplied via the
// GOOGLE_DRIVE_CREDENTIALS_PATH env var) and uploads candidate resume /
// cover-letter buffers to the folder identified by GOOGLE_DRIVE_FOLDER_ID.
//
// Returns { id, webViewLink, webContentLink } so callers can persist the
// shareable link in the database (replacing the previous local /uploads path).
// ─────────────────────────────────────────────────────────────────────────────

const fs       = require('fs');
const path     = require('path');
const { Readable } = require('stream');
const { google }  = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

let _drive = null;

function _resolveCredsPath() {
  const credPath = process.env.GOOGLE_DRIVE_CREDENTIALS_PATH;
  if (!credPath) {
    throw new Error('Google Drive not configured: GOOGLE_DRIVE_CREDENTIALS_PATH is not set');
  }
  // Resolve relative to project root (cwd) so "./config/..." works from any cwd
  return path.isAbsolute(credPath) ? credPath : path.resolve(process.cwd(), credPath);
}

function _getDriveClient() {
  if (_drive) return _drive;

  const absPath = _resolveCredsPath();
  if (!fs.existsSync(absPath)) {
    throw new Error(`Google Drive credentials file not found at: ${absPath}`);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: absPath,
    scopes:  SCOPES,
  });

  _drive = google.drive({ version: 'v3', auth });
  return _drive;
}

/**
 * Upload a single file buffer to Google Drive.
 *
 * @param {Buffer} fileBuffer  - raw file bytes
 * @param {string} originalName - filename to store in Drive (e.g. "resume.pdf")
 * @param {string} mimeType    - MIME type (e.g. "application/pdf")
 * @returns {Promise<{ id: string, webViewLink: string, webContentLink: string }>}
 */
async function uploadToDrive(fileBuffer, originalName, mimeType) {
  if (!Buffer.isBuffer(fileBuffer))   throw new Error('uploadToDrive: fileBuffer must be a Buffer');
  if (!originalName || typeof originalName !== 'string') {
    throw new Error('uploadToDrive: originalName is required');
  }

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error('Google Drive not configured: GOOGLE_DRIVE_FOLDER_ID is not set');
  }

  const drive = _getDriveClient();

  const fileMeta = {
    name:    originalName,
    parents: [folderId],
  };

  const media = {
    mimeType: mimeType || 'application/octet-stream',
    body:     Readable.from(fileBuffer),
  };

  // 1. Upload the file
  const created = await drive.files.create({
    requestBody:       fileMeta,
    media,
    fields:            'id, webViewLink, webContentLink',
    supportsAllDrives: true,
  });

  const fileId = created.data.id;
  if (!fileId) throw new Error('Drive upload returned no file id');

  // 2. Make the file readable by anyone with the link
  //    (HR / interviewers click the stored URL — no extra auth needed).
  //    Failure here is non-fatal: the file is uploaded; the folder may
  //    already grant the needed access.
  try {
    await drive.permissions.create({
      fileId,
      requestBody:       { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    });
  } catch (permErr) {
    console.warn('Drive permission set warning:', permErr.message);
  }

  // 3. Re-fetch to get the canonical sharable links (post-permission)
  const fresh = await drive.files.get({
    fileId,
    fields:            'id, webViewLink, webContentLink',
    supportsAllDrives: true,
  });

  return {
    id:             fresh.data.id,
    webViewLink:    fresh.data.webViewLink    || null,
    webContentLink: fresh.data.webContentLink || null,
  };
}

/**
 * Quick boolean: is Drive storage configured?
 * Useful for tests / fall-back logic if you ever want to keep local storage.
 */
function isDriveConfigured() {
  return Boolean(
    process.env.GOOGLE_DRIVE_CREDENTIALS_PATH &&
    process.env.GOOGLE_DRIVE_FOLDER_ID
  );
}

module.exports = { uploadToDrive, isDriveConfigured };
