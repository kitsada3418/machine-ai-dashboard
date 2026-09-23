require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'qK8x2mNp5vR9tW3yB7dF1gH4jL6sC0aE';

const { test } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const { authenticateToken, requireRole, SECRET_KEY } = require('../authMiddleware');

function mockRes() {
    const res = {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
    return res;
}

test('authenticateToken rejects request without token', () => {
    const req = { headers: {} };
    const res = mockRes();
    let nextCalled = false;
    authenticateToken(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
});

test('authenticateToken accepts valid token', () => {
    const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, SECRET_KEY, { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    let nextCalled = false;
    authenticateToken(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.user.username, 'admin');
});

test('requireRole allows matching role', () => {
    const req = { user: { role: 'admin' } };
    const res = mockRes();
    let nextCalled = false;
    requireRole('admin')(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
});

test('requireRole rejects non-matching role', () => {
    const req = { user: { role: 'viewer' } };
    const res = mockRes();
    let nextCalled = false;
    requireRole('admin')(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
});

test('JWT_SECRET is configured', () => {
    assert.ok(SECRET_KEY && SECRET_KEY.length > 20);
});
