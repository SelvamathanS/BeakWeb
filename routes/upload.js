// routes/upload.js — Unrestricted File Upload
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// INTENTIONALLY VULNERABLE: stores original filename, no MIME validation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // INTENTIONAL: use original filename — path traversal + overwrite risk
    cb(null, file.originalname);
  }
});

// INTENTIONAL: no fileFilter — accepts any MIME type
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ─── Upload endpoint ──────────────────────────────────────────────────────────
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  res.json({
    success:    true,
    filename:   req.file.originalname,
    mimetype:   req.file.mimetype,
    size:       req.file.size,
    path:       `/uploads/${req.file.originalname}`,
    accessUrl:  `http://localhost:${process.env.PORT || 3000}/uploads/${req.file.originalname}`,
    _warning:   'Unrestricted Upload: No MIME validation, original filename preserved'
  });
});

// ─── List uploads ─────────────────────────────────────────────────────────────
router.get('/api/upload', (req, res) => {
  const uploadDir = path.join(__dirname, '..', 'uploads');
  let files = [];

  try {
    if (fs.existsSync(uploadDir)) {
      files = fs.readdirSync(uploadDir).map(f => ({
        name: f,
        url:  `/uploads/${f}`,
        size: fs.statSync(path.join(uploadDir, f)).size
      }));
    }
  } catch (err) {
    return res.json({ error: err.message });
  }

  res.json({ files, count: files.length, _warning: 'Directory listing of uploads — information disclosure' });
});

// ─── Delete upload ────────────────────────────────────────────────────────────
router.delete('/upload/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '..', 'uploads', filename);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, deleted: filename });
    } else {
      res.json({ error: 'File not found' });
    }
  } catch (err) {
    res.json({ error: err.message });
  }
});

module.exports = router;
