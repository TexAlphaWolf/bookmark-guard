(() => {
  'use strict';

  const cfg = BG_CONFIG;
  const root = document.documentElement;
  const STYLE_ID = 'bookmark-guard-style';
  const linkSelector = cfg.blockedLinkSelectors.join(',');
  let state = { ...cfg.defaults };

  // ---------- Helpers ----------

  const normalize = (pathname) => (pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname);

  const isBlockedPath = (pathname) => {
    const path = normalize(pathname);
    return (
      cfg.blockedExactPaths.includes(path) ||
      cfg.blockedPathPrefixes.some((p) => path === p || path.startsWith(p + '/'))
    );
  };

  // ---------- CSS generated from the config ----------

  function buildCss() {
    const scope = (mode) =>
      cfg.blockedLinkSelectors.map((s) => `html.bg-on[data-bg-mode="${mode}"] ${s}`).join(',\n');

    return `
${scope('dim')} {
  pointer-events: none !important;
  opacity: 0.25 !important;
  filter: grayscale(1) !important;
  cursor: not-allowed !important;
}
${scope('hide')} {
  display: none !important;
}
/* Hide the page content while a blocked page is being redirected,
   so Bookmarks never flash on screen */
html.bg-on[data-bg-blocked] main {
  visibility: hidden !important;
}`;
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = buildCss();
    // At document_start <head> may not exist yet; documentElement always does
    (document.head || root).appendChild(style);
  }

  // ---------- Redirect (X is a single-page app) ----------

  let fallbackTimer = null;

  function checkLocation() {
    const blocked = !!state.enabled && isBlockedPath(location.pathname);
    root.toggleAttribute('data-bg-blocked', blocked);

    if (!blocked) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
      return;
    }

    // Preferred: click the Likes tab, so X switches tab without reloading
    const target = document.querySelector(cfg.redirectLinkSelector);
    if (target) {
      target.click();
      return;
    }

    // Fallback: if the tab doesn't show up in time, do a full navigation
    if (!fallbackTimer) {
      fallbackTimer = setTimeout(() => {
        fallbackTimer = null;
        if (state.enabled && isBlockedPath(location.pathname)) location.replace(cfg.redirectTo);
      }, cfg.redirectFallbackMs);
    }
  }

  // ---------- Click blocking (works even if the CSS fails) ----------

  function onClick(e) {
    if (!state.enabled) return;
    const link = e.target instanceof Element ? e.target.closest('a') : null;
    if (link && link.matches(linkSelector)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }

  // ---------- Keyboard shortcut blocking (e.g. "g" then "b") ----------

  let lastKey = null;
  let lastKeyTime = 0;

  function isTyping(target) {
    return (
      target instanceof Element &&
      target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]') !== null
    );
  }

  function onKeyDown(e) {
    if (!state.enabled || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
    const key = e.key.toLowerCase();
    const now = Date.now();

    const hit = cfg.blockedShortcuts.some(
      ([first, second]) => key === second && lastKey === first && now - lastKeyTime < 1500
    );
    if (hit) {
      e.preventDefault();
      e.stopImmediatePropagation();
      lastKey = null;
      return;
    }
    lastKey = key;
    lastKeyTime = now;
  }

  // ---------- State ----------

  function apply() {
    root.classList.toggle('bg-on', !!state.enabled);
    root.dataset.bgMode = state.mode === 'hide' ? 'hide' : 'dim';
    checkLocation();
  }

  chrome.storage.local.get(cfg.defaults).then((stored) => {
    state = { ...cfg.defaults, ...stored };
    apply();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const [k, { newValue }] of Object.entries(changes)) state[k] = newValue;
    apply();
  });

  // ---------- Startup ----------

  apply(); // apply defaults right away, before storage responds
  injectStyle();
  window.addEventListener('click', onClick, true);
  window.addEventListener('auxclick', onClick, true); // middle click = new tab
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('popstate', checkLocation);
  if ('navigation' in window) {
    window.navigation.addEventListener('navigatesuccess', checkLocation);
  }

  // While on a blocked page, react as soon as the Likes tab is rendered
  new MutationObserver(() => {
    if (root.hasAttribute('data-bg-blocked')) checkLocation();
  }).observe(root, { childList: true, subtree: true });

  setInterval(checkLocation, 300); // safety net for pushState navigation
})();
