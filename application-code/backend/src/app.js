const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const leaderboardRouter = require('./routes/leaderboard');
const { metricsMiddleware, metricsHandler } = require('./metrics');

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const app = express();

app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: '10kb' }));
app.use(metricsMiddleware);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/metrics', metricsHandler);

app.use('/api/leaderboard', leaderboardRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
