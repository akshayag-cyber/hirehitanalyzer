const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { getDB } = require('../database');
const { uploadToDrive } = require('../services/driveService');

const router = express.Router();

// ── Multer: in-memory storage so we can hand the buffer to AI extraction
//          BEFORE shipping it to Google Drive (no local disk writes). ─────────

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB hard cap (unchanged)
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Only PDF, DOC, DOCX, TXT allowed'));
  },
});

// ── Helper: extract text from an uploaded buffer
//          (mirrors the previous on-disk extractor — same placeholder strategy
//           for PDF/DOCX so AI scoring behaves IDENTICALLY to before). ────────

function extractTextFromBuffer(buffer, fileName) {
  try {
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.txt') return buffer.toString('utf-8');
    return `[${ext.toUpperCase()} file: ${fileName}] - PDF/DOCX text extraction requires additional setup. Please upload as TXT.`;
  } catch (err) {
    console.error('Buffer text extraction error:', err);
    return null;
  }
}

// POST /api/applications — candidate form submission
router.post(
  '/',
  upload.fields([{ name: 'cv', maxCount: 1 }, { name: 'cover_letter_file', maxCount: 1 }]),
  async (req, res) => {
    try {
      const db = getDB();
      const {
        full_name, email, phone, primary_role,
        preferred_domains, education, cover_letter,
        salary_min, salary_max, salary_flexible,
        years_of_experience, night_shift_preference,
      } = req.body;

      // ── Required field validation ─────────────────────────────────────────
      const missing = [];
      if (!full_name?.trim()) missing.push('Full Name');
      if (!email?.trim())     missing.push('Email');
      if (!phone?.trim())     missing.push('Phone Number');
      if (missing.length) {
        return res.status(400).json({ error: `Required fields missing: ${missing.join(', ')}` });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email address format' });
      }
      if (!/^[\d\s\+\-\(\)]{7,20}$/.test(phone.trim())) {
        return res.status(400).json({ error: 'Invalid phone number format' });
      }
      if (!req.files?.cv?.[0]) {
        return res.status(400).json({ error: 'CV is required' });
      }

      // ── Duplicate check ───────────────────────────────────────────────────
      const existing = await db
        .prepare('SELECT id FROM applications WHERE email = $1')
        .get(email.toLowerCase().trim());
      if (existing) {
        return res.status(409).json({ error: 'An application with this email already exists.' });
      }

      const cvFile = req.files.cv[0];
      const clFile = req.files.cover_letter_file?.[0] || null;

      // ── 1) AI text extraction FIRST (before any Drive call) ───────────────
      //   Cover-letter file: extract text from buffer (same logic as before,
      //   just buffer-based instead of disk-based). Pasted-text cover letter
      //   takes precedence ONLY if no file was uploaded — preserves prior behaviour.
      let coverLetterText = cover_letter?.trim() || null;
      if (clFile) {
        coverLetterText = extractTextFromBuffer(clFile.buffer, clFile.originalname);
      }

      // ── 2) Upload to Google Drive ─────────────────────────────────────────
      let cvDrive = null;
      let clDrive = null;
      try {
        cvDrive = await uploadToDrive(cvFile.buffer, cvFile.originalname, cvFile.mimetype);
        if (clFile) {
          clDrive = await uploadToDrive(clFile.buffer, clFile.originalname, clFile.mimetype);
        }
      } catch (driveErr) {
        console.error('Google Drive upload failed:', driveErr);
        return res.status(502).json({
          error: 'Resume upload to Google Drive failed. Please try again later.',
          detail: driveErr.message,
        });
      }

      // Prefer webContentLink (direct download); fall back to webViewLink
      // (in-browser preview) if the former is unavailable.
      const cvLink = cvDrive.webContentLink || cvDrive.webViewLink;
      const clLink = clDrive ? (clDrive.webContentLink || clDrive.webViewLink) : null;
      if (!cvLink) {
        return res.status(502).json({ error: 'Drive returned no shareable link for CV.' });
      }

      // ── 3) Derive primary_role ────────────────────────────────────────────
      let resolvedRole = primary_role?.trim();
      if (!resolvedRole && preferred_domains) {
        try {
          const parsed = JSON.parse(preferred_domains);
          resolvedRole = Array.isArray(parsed) ? parsed[0] : null;
        } catch {}
      }
      resolvedRole = resolvedRole || 'Not Specified';

      // ── 4) Persist (same INSERT shape; cv_drive_id added at the tail) ────
      const result = await db.prepare(`
        INSERT INTO applications
          (full_name, email, phone, primary_role, preferred_domains, education, cover_letter,
           cv_path, cv_filename, salary_min, salary_max, salary_flexible, years_of_experience,
           cover_letter_path, cover_letter_filename, night_shift_preference, cv_drive_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id
      `).run(
        full_name.trim(),
        email.toLowerCase().trim(),
        phone.trim(),
        resolvedRole,
        preferred_domains || null,
        education?.trim() || null,
        coverLetterText,
        cvLink,                          // ← Drive link instead of /uploads/...
        cvFile.originalname,             // unchanged: original filename for UI
        salary_flexible === 'true' ? null : (parseInt(salary_min) || null),
        salary_flexible === 'true' ? null : (parseInt(salary_max) || null),
        salary_flexible === 'true' ? 1 : 0,
        parseInt(years_of_experience) || null,
        clLink,                          // ← Drive link (or null) for cover letter
        clFile ? clFile.originalname : null,
        night_shift_preference?.trim() || null,
        cvDrive.id,                      // ← Drive file id (for future fetch/replace)
      );

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully. Thank you.',
        id: result.lastInsertRowid,
      });
    } catch (err) {
      console.error('Submission error:', err);
      if (err.message?.includes('unique')) {
        return res.status(409).json({ error: 'An application with this email already exists.' });
      }
      res.status(500).json({ error: 'Failed to submit application. Please try again.' });
    }
  }
);

module.exports = router;
