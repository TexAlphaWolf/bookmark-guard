# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-11-16

### Added
- Blocks the **Bookmarks** tab inside X's **History** page while keeping the sidebar **History** link usable.
- Redirects any attempt to open Bookmarks (default History tab, typed URL, browser history, in-app navigation) to the **Likes** tab.
- In-app redirect by clicking the Likes tab, with page content hidden during the switch so Bookmarks never flash on screen.
- Network-level redirect rule (`declarativeNetRequest`) for full page loads of `/i/history` and `/i/bookmarks`.
- Click and middle-click blocking on the Bookmarks tab.
- Disables X's `g` → `b` keyboard shortcut, without affecting typing in text fields.
- Toolbar popup to turn blocking on/off and choose between *Faded, not clickable* and *Fully hidden*.
- Support for Chrome, Edge, Brave, Opera, Vivaldi and Firefox 140+.
- Automated tests (Node test runner + jsdom), web-ext lint, CI and automatic GitHub releases.

[1.0.0]: https://github.com/TexAlphaWolf/bookmark-guard/releases/tag/v1.0.0
