// Live tests against the Storytel API, without mocks: only the real responses show format changes
const { test } = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');
const fs = require('fs');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storytel-test-'));
process.env.CACHE_DB = path.join(tmpDir, 'cache.db');
process.env.LOG_LEVEL = 'silent';

const { StorytelProvider, closeDb } = require('../src/provider');
const provider = new StorytelProvider();

test.after(() => {
    closeDb();
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('stripHtml removes nested tags and decodes &amp; last', () => {
    assert.ok(!provider.stripHtml('<p>a<scr<b>ipt>alert(1)</script>b</p>').includes('<'));
    assert.strictEqual(provider.stripHtml('&amp;lt;x&amp;gt;'), '&lt;x&gt;');
    assert.strictEqual(provider.stripHtml('a<br>b'), 'a\nb');
});

test('upgradeCoverUrl uses www host and 1200x1200', () => {
    assert.strictEqual(
        provider.upgradeCoverUrl('/images/320x320/0000016112.jpg'),
        'https://www.storytel.com/images/1200x1200/0000016112.jpg'
    );
    assert.strictEqual(provider.upgradeCoverUrl(undefined), undefined);
});

test('authorMatchScore ranks exact > partial > none', () => {
    assert.strictEqual(provider.authorMatchScore('Sebastian Fitzek', 'sebastian fitzek'), 1);
    assert.ok(provider.authorMatchScore('Sebastian Fitzek', 'Fitzek') >= 0.8);
    assert.strictEqual(provider.authorMatchScore('Astrid Lindgren', 'Fitzek'), 0);
});

test('audiobook search returns well-formed ABS metadata', async () => {
    const { matches } = await provider.searchBooks('Die Therapie', 'Sebastian Fitzek', 'de', 'audiobook', 5);
    assert.ok(matches.length > 0, 'expected at least one match');
    const first = matches[0];
    assert.strictEqual(first.title, 'Die Therapie');
    assert.match(first.author, /Fitzek/);
    assert.ok(first.narrator, 'audiobook should have a narrator');
    assert.ok(first.duration > 0, 'audiobook should have a duration');
    assert.match(first.cover, /^https:\/\/www\.storytel\.com\/images\/.*1200x1200/);
    for (const m of matches) {
        for (const [key, value] of Object.entries(m)) {
            assert.notStrictEqual(value, null, `field ${key} must not be null`);
        }
    }
});

test('ebook search contains no audiobook fields', async () => {
    const { matches } = await provider.searchBooks('Harry Potter', '', 'de', 'ebook', 5);
    assert.ok(matches.length > 0);
    for (const m of matches) {
        assert.strictEqual(m.narrator, undefined);
        assert.strictEqual(m.duration, undefined);
    }
});

test('limit is applied per request, not baked into the cache', async () => {
    const one = await provider.searchBooks('Astrid Lindgren', '', 'se', 'all', 1);
    assert.strictEqual(one.matches.length, 1);
    const five = await provider.searchBooks('Astrid Lindgren', '', 'se', 'all', 5);
    assert.strictEqual(five.matches.length, 5);
    assert.deepStrictEqual(five.matches[0], one.matches[0]);
});

test('invalid limit falls back to default instead of returning nothing', async () => {
    const { matches } = await provider.searchBooks('Astrid Lindgren', '', 'se', 'all', NaN);
    assert.ok(matches.length > 0);
});

test('exact ISBN hit is ranked first', async () => {
    // "Drei Mann in einem Boot" (Lauscherlounge) — not the first hit for this query without ISBN
    const isbn = '9783911421355';
    const { matches } = await provider.searchBooks('Drei Mann', '', 'de', 'audiobook', 5, isbn);
    assert.ok(matches.length > 0);
    assert.strictEqual(matches[0].isbn, isbn);
});
