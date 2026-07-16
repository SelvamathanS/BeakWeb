// routes/prototype.js — Client-Side Prototype Pollution
const express = require('express');
const router  = express.Router();

// Base settings object
let settings = {
  theme:    'dark',
  language: 'en',
  timezone: 'UTC',
  debug:    false,
  version:  '1.0.0'
};

// ─── Insecure deep merge (prototype pollution vector) ─────────────────────────
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object') {
      // INTENTIONALLY VULNERABLE: allows __proto__, constructor, prototype keys
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// ─── POST: Merge user settings ────────────────────────────────────────────────
router.post('/settings', (req, res) => {
  const userInput = req.body;

  let result = {
    input:       userInput,
    before:      { ...settings },
    merged:      null,
    polluted:    null,
    error:       null,
    _warning:    'Prototype Pollution: deepMerge allows __proto__ key injection'
  };

  try {
    // INTENTIONALLY VULNERABLE: user controls keys including __proto__
    deepMerge(settings, userInput);

    result.merged   = { ...settings };
    result.polluted = {
      'Object.prototype.polluted': ({}).__proto__.polluted,
      'Object.prototype.isAdmin':  ({}).__proto__.isAdmin,
      'Object.prototype.role':     ({}).__proto__.role,
      rawProto:                    Object.prototype
    };
  } catch (err) {
    result.error = err.message;
  }

  res.json(result);
});

// ─── GET: Current settings ────────────────────────────────────────────────────
router.get('/settings', (req, res) => {
  res.json({
    settings,
    prototype_check: {
      polluted: ({}).__proto__.polluted,
      isAdmin:  ({}).__proto__.isAdmin,
      role:     ({}).__proto__.role
    },
    hints: [
      'POST { "__proto__": { "isAdmin": true } }',
      'POST { "constructor": { "prototype": { "role": "admin" } } }',
      'POST { "__proto__": { "polluted": "yes" } }'
    ]
  });
});

router.get('/api/settings', (req, res) => {
  res.json({ settings, _warning: 'Prototype Pollution endpoint' });
});

// ─── Reset settings ───────────────────────────────────────────────────────────
router.post('/settings/reset', (req, res) => {
  // Clean up prototype pollution
  delete Object.prototype.polluted;
  delete Object.prototype.isAdmin;
  delete Object.prototype.role;
  delete Object.prototype.admin;

  settings = {
    theme:    'dark',
    language: 'en',
    timezone: 'UTC',
    debug:    false,
    version:  '1.0.0'
  };

  res.json({ success: true, settings });
});

module.exports = router;
