// End-to-end tests of the HTTP layer against the live Storytel API
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const PORT = 3987;
const BASE = `http://127.0.0.1:${PORT}`;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storytel-server-test-'));
let server;

before(async () => {
    server = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'server.js')], {
        env: { ...process.env, PORT: String(PORT), CACHE_DB: path.join(tmpDir, 'cache.db'), LOG_LEVEL: 'silent', AUTH: '' },
        stdio: 'ignore'
    });
    for (let i = 0; i < 50; i++) {
        try {
            await fetch(`${BASE}/health`);
            return;
        } catch {
            await new Promise(r => setTimeout(r, 100));
        }
    }
    throw new Error('server did not start');
});

after(() => {
    server.kill('SIGTERM');
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('health endpoint reports ok', async () => {
    const res = await fetch(`${BASE}/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
});

test('missing query returns 400', async () => {
    const res = await fetch(`${BASE}/de/search`);
    assert.strictEqual(res.status, 400);
});

test('repeated query parameter returns 400', async () => {
    const res = await fetch(`${BASE}/de/search?query=a&query=b`);
    assert.strictEqual(res.status, 400);
});

test('non-numeric limit returns 400', async () => {
    const res = await fetch(`${BASE}/de/search?query=Harry+Potter&limit=abc`);
    assert.strictEqual(res.status, 400);
});

test('malformed isbn is ignored, search still works', async () => {
    const res = await fetch(`${BASE}/de/audiobook/search?query=Die+Therapie&isbn=not-an-isbn`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.matches.length > 0);
});

test('audiobook endpoint returns matches with stats', async () => {
    const res = await fetch(`${BASE}/de/audiobook/search?query=Die+Therapie&author=Sebastian+Fitzek&limit=3`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.matches.length > 0 && body.matches.length <= 3);
    assert.strictEqual(body.stats.total, body.matches.length);
});
