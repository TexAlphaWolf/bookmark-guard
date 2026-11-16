# Bookmark Guard for X

[![CI](https://github.com/TexAlphaWolf/bookmark-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/TexAlphaWolf/bookmark-guard/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/TexAlphaWolf/bookmark-guard)](https://github.com/TexAlphaWolf/bookmark-guard/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A Manifest V3 browser extension that stops you from accidentally opening the **Bookmarks** section of X/Twitter — handy when you're scrolling the feed with friends watching the screen.

Works on Chrome, Edge, Brave, Opera, Vivaldi and Firefox 140+ from a single codebase.

## Quick start

1. Download `bookmark-guard-X.Y.Z.zip` from the [latest release](https://github.com/TexAlphaWolf/bookmark-guard/releases/latest) and extract it, or clone this repository and use its `extension/` folder.
2. Load it in your browser (see [Installation](#installation)).
3. Open [x.com](https://x.com) and click **History** in the sidebar: it opens straight on the **Likes** tab, and the **Bookmarks** tab is faded and does nothing when clicked.
4. Click the extension icon in the toolbar to:
   - turn blocking **on or off**
   - choose **Faded, not clickable** or **Fully hidden** for the link

Changes apply instantly, no page reload needed.

## How it works

Blocking happens on four layers, so if one stops working the next one still catches it:

| Layer | What it does |
|---|---|
| CSS | The Bookmarks tab becomes faded and unclickable, or disappears completely. The sidebar **History** link stays usable |
| Click | A capture-phase listener cancels clicks (including middle-click) on the Bookmarks tab |
| Shortcut | Disables X's `g` → `b` keyboard shortcut that opens Bookmarks |
| Redirect | If X opens Bookmarks (`/i/history`, `/i/bookmarks`, typed URL, browser history, in-app navigation) you're sent to **Likes** (`/i/history/likes`) |

The redirect runs on two levels: a `declarativeNetRequest` rule for real page loads, and a check in the content script for X's in-app navigation (X is a single-page app and doesn't reload the page). In the app, the extension simply clicks the Likes tab for you, so the switch is instant; while that happens the page content is hidden, so Bookmarks never flash on screen.

> **Why the tab is matched by role, not by URL:** on X both the sidebar **History** link and the **Bookmarks** tab point to `/i/history`. The extension only blocks the one with `role="tab"`, so History keeps working.

## Installation

### Chrome, Edge, Brave, Opera, Vivaldi
1. Open `chrome://extensions` (`edge://extensions` on Edge).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select the extracted release folder, or the `extension/` folder of your clone (not the repository root).

Chrome shows a warning about `browser_specific_settings`: that key is for Firefox and is ignored, you can leave it.

### Firefox (140 or later)
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and select `manifest.json` (inside `extension/` if you cloned the repository).
3. In Manifest V3, Firefox requires site permissions to be granted manually: go to `about:addons` → Bookmark Guard → **Permissions** and allow access to x.com and twitter.com.

Temporary add-ons are removed when Firefox closes. For a permanent install, sign the extension on addons.mozilla.org (it can be unlisted, just for you), or use Firefox Developer Edition with `xpinstall.signatures.required` set to `false`.

## Project structure

```
bookmark-guard/
├── extension/                the extension itself (this is what the browser loads)
│   ├── manifest.json
│   ├── rules/redirect.json   network-level redirect rule
│   ├── src/config.js         paths, selectors and defaults (customize here)
│   ├── src/content.js        logic that runs on the page
│   ├── popup/                toggle UI
│   └── icons/
├── tests/                    automated tests (Node test runner + jsdom)
├── .github/                  CI, release workflow and issue template
├── package.json              dev tooling: lint, test, build
├── CHANGELOG.md
└── LICENSE
```

Keeping the extension in its own folder means development files (`node_modules`, tests, CI) never end up in the browser or in the release package.

## Development

Requires Node.js 22 or later.

```bash
npm install        # install dev tools (web-ext, jsdom)
npm test           # run the automated tests
npm run lint       # validate the extension with Mozilla's web-ext
npm run check      # lint + tests
npm run build      # create dist/bookmark-guard-<version>.zip
```

The tests load the content script into a simulated page that reproduces X's real History layout, and check the network redirect rule against allowed and blocked URLs.

## Manual testing checklist

- [ ] Sidebar: **History** is clickable and opens directly on the **Likes** tab
- [ ] No Bookmarks content flashes on screen while switching
- [ ] **Bookmarks** tab: faded, clicking it does nothing
- [ ] Middle-click on the Bookmarks tab: no new tab opens
- [ ] **Likes** tab: works normally
- [ ] Type `x.com/i/history` or `x.com/i/bookmarks` in the address bar: you land on `/i/history/likes`
- [ ] Press `g` then `b` on the timeline: nothing happens
- [ ] While writing a post, `g` and `b` type normally
- [ ] Popup → **Fully hidden**: the Bookmarks tab disappears immediately, no reload
- [ ] Popup → turn off: History opens on Bookmarks again, tab clickable, direct URL included
- [ ] Turn back on and reload: blocking is back
- [ ] Repeat on `twitter.com`

For debugging: when blocking is active, the page's `<html>` element has the `bg-on` class and a `data-bg-mode` attribute; `data-bg-blocked` appears while a blocked page is being redirected.

## Customization

Everything lives in `extension/src/config.js`:

- `blockedPathPrefixes` / `blockedExactPaths`: pages that trigger the redirect
- `redirectTo` and `redirectLinkSelector`: where you're sent instead
- `blockedLinkSelectors`: links that are faded/hidden and unclickable

If you change the blocked paths or the destination, update `extension/rules/redirect.json` to match, then run `npm test`.

## Limitations

This guards against misclicks, it is not a security feature: anyone using the computer can disable it, or open Bookmarks from another device. If X changes its page markup the CSS may stop matching, but the redirect relies on the URL and keeps working. If X renames or moves the History tabs, update the selectors in `extension/src/config.js`.

## Releases

Each tag `vX.Y.Z` triggers a GitHub Actions workflow that checks the tag matches the version in `extension/manifest.json` and `package.json`, runs lint and tests, builds the package and publishes a [release](https://github.com/TexAlphaWolf/bookmark-guard/releases) with the notes from [CHANGELOG.md](CHANGELOG.md).

To publish a new version:

1. Bump `version` in both `extension/manifest.json` and `package.json`.
2. Add a section for it in `CHANGELOG.md`.
3. Commit, then `git tag -a vX.Y.Z -m "vX.Y.Z"` and `git push origin main --follow-tags`.

## License

[MIT](LICENSE) © TexAlphaWolf
