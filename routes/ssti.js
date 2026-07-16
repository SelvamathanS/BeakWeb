// routes/ssti.js — Server-Side Template Injection
const express = require('express');
const router  = express.Router();
const ejs     = require('ejs');

// ─── SSTI: Unsafe template rendering ──────────────────────────────────────────
router.post('/template', (req, res) => {
  const { template, name } = req.body;

  if (!template) return res.status(400).json({ error: 'template is required' });

  // INTENTIONALLY VULNERABLE: user-supplied template rendered with full EJS access
  let result = {
    template,
    rendered: null,
    error:    null,
    _warning: 'SSTI: User-supplied template rendered without sandboxing'
  };

  try {
    // Dangerous: allows arbitrary code execution via EJS tags
    result.rendered = ejs.render(template, { name: name || 'World', process, require, __dirname });
  } catch (err) {
    result.error = err.message;
  }

  res.json(result);
});

// ─── GET demo ─────────────────────────────────────────────────────────────────
router.get('/template', (req, res) => {
  res.json({
    hint:     'POST to /template with { template, name }',
    examples: [
      { template: 'Hello <%= name %>!',                                    description: 'Normal EJS' },
      { template: '<%= 7*7 %>',                                            description: 'Expression eval' },
      { template: '<%= process.version %>',                                description: 'Node.js version disclosure' },
      { template: "<%= require('os').hostname() %>",                       description: 'OS hostname' },
      { template: "<%= require('fs').readdirSync('.').join(', ') %>",      description: 'Directory listing' },
      { template: "<%= process.env.PATH %>",                               description: 'Env variable leak' }
    ]
  });
});

module.exports = router;
