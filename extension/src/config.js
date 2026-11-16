// Shared configuration for the content script.
// If you change the blocked paths, update rules/redirect.json as well.
const BG_CONFIG = {
  // Paths blocked by prefix (the path itself and everything under it)
  blockedPathPrefixes: ['/i/bookmarks', '/i/history/bookmarks'],

  // Paths blocked only as an exact match (trailing slash allowed).
  // On X, /i/history opens the Bookmarks tab by default, while
  // /i/history/likes must stay reachable.
  blockedExactPaths: ['/i/history'],

  // Where to go when a blocked path is reached
  redirectTo: '/i/history/likes',

  // Link that performs the redirect inside the app (instant, no reload).
  // If it isn't found in time, a full navigation to redirectTo is used instead.
  redirectLinkSelector:
    'a[role="tab"][href="/i/history/likes"], [role="tablist"] a[href="/i/history/likes"]',

  // Links that must be faded/hidden and unclickable.
  // The sidebar "History" link also points to /i/history, so the Bookmarks
  // tab is matched by its tab role, not by href alone.
  blockedLinkSelectors: [
    'a[role="tab"][href="/i/history"]',
    '[role="tablist"] a[href="/i/history"]',
    'a[href="/i/bookmarks"]',
    'a[href^="/i/bookmarks/"]',
    'a[href^="/i/bookmarks?"]',
    'a[href^="/i/history/bookmarks"]',
    'a[href^="https://x.com/i/bookmarks"]',
    'a[href^="https://twitter.com/i/bookmarks"]'
  ],

  // X keyboard shortcuts to disable (key sequences)
  blockedShortcuts: [['g', 'b']],

  // How long to wait for the in-app redirect before reloading (ms)
  redirectFallbackMs: 1500,

  // Default values saved in storage
  defaults: {
    enabled: true,
    mode: 'dim' // 'dim' = faded and not clickable, 'hide' = fully hidden
  }
};
