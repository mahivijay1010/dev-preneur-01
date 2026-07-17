const express = require('express');
const rateLimit = require('express-rate-limit');

const { requireAuth } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth);
router.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 40,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'AI request limit reached. Please try again shortly.' },
  }),
);

router.post('/messages', async (req, res, next) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'AI personalization is not configured.' });
    }

    const system = typeof req.body.system === 'string' ? req.body.system.slice(0, 20000) : '';
    const messages = Array.isArray(req.body.messages) ? req.body.messages.slice(-10) : [];
    const maxTokens = Math.min(Math.max(Number(req.body.maxTokens) || 600, 64), 1200);
    if (!system || messages.length === 0) {
      return res.status(400).json({ error: 'System instructions and messages are required.' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        system,
        messages,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      return res.status(response.status >= 500 ? 502 : response.status).json({
        error: payload?.error?.message || 'AI request failed.',
      });
    }
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
