const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const EventEmitter = require('node:events');

const { metricsMiddleware } = require('../src/metrics');

function fakeResponse() {
  const res = new EventEmitter();
  res.statusCode = 200;
  return res;
}

describe('metricsMiddleware', () => {
  test('calls next immediately', () => {
    const req = { method: 'GET', baseUrl: '', route: undefined };
    const res = fakeResponse();
    let nextCalled = false;

    metricsMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  test('records duration using the matched route on finish', () => {
    const req = { method: 'GET', baseUrl: '/api/leaderboard', route: { path: '/' } };
    const res = fakeResponse();

    metricsMiddleware(req, res, () => {});
    res.statusCode = 200;

    assert.doesNotThrow(() => res.emit('finish'));
  });

  test('falls back to "unmatched" when no route matched', () => {
    const req = { method: 'GET', baseUrl: '', route: undefined };
    const res = fakeResponse();

    metricsMiddleware(req, res, () => {});
    res.statusCode = 404;

    assert.doesNotThrow(() => res.emit('finish'));
  });
});
