// routes/xss.js — Stored XSS via comment system
const express = require('express');
const router  = express.Router();
const db      = require('../database');

// ─── Stored XSS: Post comment (no sanitization) ───────────────────────────────
router.post('/comment', (req, res) => {
  const { author, content } = req.body;

  if (!author || !content) {
    return res.status(400).json({ error: 'author and content are required' });
  }

  // INTENTIONALLY VULNERABLE: raw user input stored without sanitization
  const stmt = db.prepare('INSERT INTO comments (author, content) VALUES (?, ?)');
  const info  = stmt.run(author, content);

  res.json({
    success: true,
    id:      info.lastInsertRowid,
    _warning: 'Content stored WITHOUT sanitization — Stored XSS vulnerability'
  });
});

// ─── Stored XSS: Get all comments (raw, unescaped) ───────────────────────────
router.get('/comments', (req, res) => {
  // INTENTIONAL: returns raw HTML content that will be rendered client-side
  const comments = db.prepare('SELECT * FROM comments ORDER BY created_at DESC').all();
  res.json({ comments, _warning: 'Content returned raw without HTML encoding' });
});

// ─── Delete comment ───────────────────────────────────────────────────────────
router.delete('/comment/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  res.json({ success: true, deleted: id });
});

// ─── Clear all comments ───────────────────────────────────────────────────────
router.post('/comments/clear', (req, res) => {
  db.prepare('DELETE FROM comments').run();
  res.json({ success: true, message: 'All comments cleared' });
});

// ─── API alias ────────────────────────────────────────────────────────────────
router.get('/api/comments', (req, res) => {
  const comments = db.prepare('SELECT * FROM comments ORDER BY created_at DESC').all();
  res.json({ comments });
});

module.exports = router;
