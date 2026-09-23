const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const Score = require('../src/models/Score');

function mockFindChain(t, resolvedScores) {
  const chain = {
    sort: () => chain,
    limit: () => chain,
    select: () => Promise.resolve(resolvedScores),
  };
  t.mock.method(Score, 'find', () => chain);
  return chain;
}

describe('GET /api/leaderboard', () => {
  test('returns scores from the database', async (t) => {
    const scores = [{ playerName: 'ada', score: 50 }];
    mockFindChain(t, scores);

    const res = await request(app).get('/api/leaderboard');

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, scores);
  });

  test('caps the limit query param at 50', async (t) => {
    let capturedLimit;
    const chain = {
      sort: () => chain,
      limit: (n) => {
        capturedLimit = n;
        return chain;
      },
      select: () => Promise.resolve([]),
    };
    t.mock.method(Score, 'find', () => chain);

    await request(app).get('/api/leaderboard?limit=9999');

    assert.equal(capturedLimit, 50);
  });

  test('defaults the limit to 10 when not provided', async (t) => {
    let capturedLimit;
    const chain = {
      sort: () => chain,
      limit: (n) => {
        capturedLimit = n;
        return chain;
      },
      select: () => Promise.resolve([]),
    };
    t.mock.method(Score, 'find', () => chain);

    await request(app).get('/api/leaderboard');

    assert.equal(capturedLimit, 10);
  });

  test('forwards database errors to the error handler', async (t) => {
    const chain = {
      sort: () => chain,
      limit: () => chain,
      select: () => Promise.reject(new Error('db down')),
    };
    t.mock.method(Score, 'find', () => chain);

    const res = await request(app).get('/api/leaderboard');

    assert.equal(res.status, 500);
  });
});

describe('POST /api/leaderboard', () => {
  test('rejects a missing playerName', async () => {
    const res = await request(app).post('/api/leaderboard').send({ score: 10 });
    assert.equal(res.status, 400);
  });

  test('rejects a playerName with invalid characters', async () => {
    const res = await request(app)
      .post('/api/leaderboard')
      .send({ playerName: 'bad<script>', score: 10 });
    assert.equal(res.status, 400);
  });

  test('rejects a non-numeric score', async () => {
    const res = await request(app)
      .post('/api/leaderboard')
      .send({ playerName: 'ada', score: 'lots' });
    assert.equal(res.status, 400);
  });

  test('rejects a negative score', async () => {
    const res = await request(app)
      .post('/api/leaderboard')
      .send({ playerName: 'ada', score: -1 });
    assert.equal(res.status, 400);
  });

  test('rejects a score above the maximum', async () => {
    const res = await request(app)
      .post('/api/leaderboard')
      .send({ playerName: 'ada', score: 100001 });
    assert.equal(res.status, 400);
  });

  test('creates a score for valid input', async (t) => {
    const created = { playerName: 'ada', score: 42, createdAt: new Date().toISOString() };
    t.mock.method(Score, 'create', () => Promise.resolve(created));

    const res = await request(app)
      .post('/api/leaderboard')
      .send({ playerName: 'ada', score: 42 });

    assert.equal(res.status, 201);
    assert.deepEqual(res.body, created);
  });

  test('forwards database errors to the error handler', async (t) => {
    t.mock.method(Score, 'create', () => Promise.reject(new Error('db down')));

    const res = await request(app)
      .post('/api/leaderboard')
      .send({ playerName: 'ada', score: 42 });

    assert.equal(res.status, 500);
  });
});
