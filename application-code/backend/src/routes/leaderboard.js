const express = require('express');
const Score = require('../models/Score');

const router = express.Router();

const MAX_LIMIT = 50;
const NAME_PATTERN = /^[A-Za-z0-9 _-]{1,20}$/;

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, MAX_LIMIT);

    const scores = await Score.find()
      .sort({ score: -1, createdAt: 1 })
      .limit(limit)
      .select('playerName score createdAt -_id');

    res.json(scores);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { playerName, score } = req.body;

    if (typeof playerName !== 'string' || !NAME_PATTERN.test(playerName)) {
      return res.status(400).json({ error: 'playerName must be 1-20 alphanumeric characters' });
    }

    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100000) {
      return res.status(400).json({ error: 'score must be a number between 0 and 100000' });
    }

    const created = await Score.create({ playerName, score });

    res.status(201).json({
      playerName: created.playerName,
      score: created.score,
      createdAt: created.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
