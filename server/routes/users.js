const express = require('express');

const { publicUser, requireAuth } = require('../lib/auth');
const User = require('../models/User');

const router = express.Router();
router.use(requireAuth);
const STATE_KEYS = new Set([
  'profile', 'plan', 'logs', 'reviews', 'adjustments', 'chat',
  'ownedIngredients', 'measurements', 'repairsCompleted',
  'progressPhotos', 'reminderPrefs', 'restaurantHistory',
  'connectedWearables', 'assignedExpertId', 'expertMessages', 'planReviews',
]);

router.patch('/me/consent', async (req, res, next) => {
  try {
    const accepted = req.body.accepted === true;
    if (!accepted) return res.status(400).json({ error: 'Consent must be explicitly accepted.' });

    const user = await User.findByIdAndUpdate(
      req.userId,
      { consentAcceptedAt: new Date() },
      { new: true },
    );
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get('/me/state', async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('appState');
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    return res.json({ state: user.appState || {} });
  } catch (error) {
    return next(error);
  }
});

router.put('/me/state', async (req, res, next) => {
  try {
    const input = req.body.state;
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return res.status(400).json({ error: 'A valid state object is required.' });
    }
    const state = Object.fromEntries(
      Object.entries(input).filter(([key]) => STATE_KEYS.has(key)),
    );

    const user = await User.findByIdAndUpdate(
      req.userId,
      { appState: state },
      { new: true, runValidators: true },
    );
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    return res.json({ savedAt: new Date().toISOString() });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
