// Behavior tests for the content script and the network redirect rule.
// The fake page reproduces X's real History layout: the sidebar "History"
// link and the "Bookmarks" tab both point to /i/history, "Likes" is a tab
// pointing to /i/history/likes.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const EXT = path.join(__dirname, '..', 'extension');
const CONFIG_SRC = fs.readFileSync(path.join(EXT, 'src', 'config.js'), 'utf8');
const CONTENT_SRC = fs.readFileSync(path.join(EXT, 'src', 'content.js'), 'utf8');
const RULES = JSON.parse(fs.readFileSync(path.join(EXT, 'rules', 'redirect.json'), 'utf8'));

const PAGE = `<!doctype html><html><head></head><body>
<header><nav aria-label="Primary">
  <a id="side-history" href="/i/history"><span id="side-inner">History</span></a>
  <a id="home" href="/home">Home</a>
</nav></header>
<main><div role="tablist">
  <a id="tab-bm" role="tab" aria-selected="true" href="/i/history"><span id="tab-inner">Bookmarks</span></a>
  <a id="tab-likes" role="tab" aria-selected="false" href="/i/history/likes">Likes</a>
</div></main>
<textarea id="ta"></textarea>
</body></html>`;

// Every simulated page is closed at the end, even if a test fails midway,
// so leftover timers can't keep the test process alive.
const openWindows = [];
after(() => openWindows.forEach((w) => w.close()));

function load(url, stored = {}) {
  const dom = new JSDOM(PAGE, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  openWindows.push(w);
  const listeners = [];
  w.chrome = {
    storage: {
      local: { get: async (defaults) => ({ ...defaults, ...stored }) },
      onChanged: { addListener: (fn) => listeners.push(fn) }
    }
  };
  const likesClicks = { n: 0 };
  w.document.getElementById('tab-likes').addEventListener('click', () => likesClicks.n++);
  w.eval(CONFIG_SRC + '\nwindow.BG_CONFIG = BG_CONFIG;');
  w.eval(CONTENT_SRC);

  const setState = (changes) => {
    const payload = Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, { newValue: v }]));
    listeners.forEach((fn) => fn(payload, 'local'));
  };
  const click = (id, type = 'click') => {
    const e = new w.MouseEvent(type, { bubbles: true, cancelable: true, button: type === 'auxclick' ? 1 : 0 });
    w.document.getElementById(id).dispatchEvent(e);
    return e.defaultPrevented;
  };
  const key = (k, target = w.document.body) => {
    const e = new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    target.dispatchEvent(e);
    return e.defaultPrevented;
  };
  return { w, d: w.document, setState, click, key, likesClicks, close: () => w.close() };
}

test('activates on the page', () => {
  const p = load('https://x.com/home');
  assert.ok(p.d.documentElement.classList.contains('bg-on'));
  assert.equal(p.d.documentElement.dataset.bgMode, 'dim');
  assert.ok(p.d.getElementById('bookmark-guard-style'));
  p.close();
});

test('sidebar History link stays clickable', () => {
  const p = load('https://x.com/home');
  assert.equal(p.click('side-inner'), false);
  p.close();
});

test('Bookmarks tab is not clickable (click and middle-click)', () => {
  const p = load('https://x.com/home');
  assert.equal(p.click('tab-inner'), true);
  assert.equal(p.click('tab-inner', 'auxclick'), true);
  p.close();
});

test('Likes tab stays clickable', () => {
  const p = load('https://x.com/home');
  assert.equal(p.click('tab-likes'), false);
  p.close();
});

test('CSS targets the Bookmarks tab but not the bare History link', () => {
  const p = load('https://x.com/home');
  const css = p.d.getElementById('bookmark-guard-style').textContent;
  assert.match(css, /a\[role="tab"\]\[href="\/i\/history"\]/);
  // The bare History link must never be targeted directly by the mode selector
  assert.doesNotMatch(css, /\[data-bg-mode="(dim|hide)"\] a\[href="\/i\/history"\]/);
  p.close();
});

test('"g" then "b" shortcut is blocked, but not while typing', () => {
  const p = load('https://x.com/home');
  p.key('g');
  assert.equal(p.key('b'), true);
  const ta = p.d.getElementById('ta');
  p.key('g', ta);
  assert.equal(p.key('b', ta), false);
  p.close();
});

test('/i/history (Bookmarks by default) switches to Likes', () => {
  const p = load('https://x.com/i/history');
  assert.ok(p.d.documentElement.hasAttribute('data-bg-blocked'));
  assert.ok(p.likesClicks.n > 0);
  p.close();
});

test('/i/history/ with trailing slash is handled too', () => {
  const p = load('https://x.com/i/history/');
  assert.ok(p.d.documentElement.hasAttribute('data-bg-blocked'));
  p.close();
});

test('/i/history/likes is left alone', () => {
  const p = load('https://x.com/i/history/likes');
  assert.ok(!p.d.documentElement.hasAttribute('data-bg-blocked'));
  assert.equal(p.likesClicks.n, 0);
  p.close();
});

test('"hide" mode is applied live', () => {
  const p = load('https://x.com/home');
  p.setState({ mode: 'hide' });
  assert.equal(p.d.documentElement.dataset.bgMode, 'hide');
  p.close();
});

test('turning it off restores normal behavior', () => {
  const p = load('https://x.com/home');
  p.setState({ enabled: false });
  assert.ok(!p.d.documentElement.classList.contains('bg-on'));
  assert.equal(p.click('tab-inner'), false);
  p.close();
});

test('stored "off" state is respected on /i/history', async () => {
  const p = load('https://x.com/i/history', { enabled: false });
  await new Promise((r) => setTimeout(r, 20)); // let storage resolve
  assert.ok(!p.d.documentElement.hasAttribute('data-bg-blocked'));
  p.close();
});

test('network rule redirects Bookmarks URLs to Likes', () => {
  const rule = RULES[0];
  const rx = new RegExp(rule.condition.regexFilter);
  assert.equal(rule.action.redirect.url, 'https://x.com/i/history/likes');

  for (const url of [
    'https://x.com/i/history',
    'https://x.com/i/history/',
    'https://x.com/i/history?src=nav',
    'https://twitter.com/i/history',
    'https://www.x.com/i/history',
    'https://x.com/i/bookmarks',
    'https://x.com/i/bookmarks/123',
    'https://x.com/i/history/bookmarks'
  ]) assert.ok(rx.test(url), `should redirect ${url}`);

  for (const url of [
    'https://x.com/i/history/likes',
    'https://x.com/i/historyx',
    'https://x.com/home',
    'https://example.com/i/history'
  ]) assert.ok(!rx.test(url), `should allow ${url}`);
});

test('manifest and package versions match', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8'));
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  assert.equal(manifest.version, pkg.version);
});
