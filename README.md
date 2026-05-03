

<p align="center">
  <img src="firefox_addon/icon-terminal-tab.svg" width="72" height="72" alt="Terminal Tab logo">
</p>

<h1 align="center">Terminal Tab</h1>

<p align="center">
  Terminal-core, modular new tab dashboard.
</p>

<p align="center">
  <a href="https://addons.mozilla.org/firefox/addon/terminal-newtab/">
    <img src="https://blog.mozilla.org/addons/files/2020/04/get-the-addon-fx-apr-2020.svg" width="172" alt="Get the add-on for Firefox">
  </a>
</p>

<p align="center">
  <img src="https://dc.missuo.ru/file/1472233821897494592" width="900" alt="Terminal Tab preview">
</p>

---

## Features

- TUI-style modular new tab dashboard with draggable/resizable widgets
- Built-in widgets: search, date/time, stats, weather, links, todo, and fun extras
- Integrations: <img src="https://cdn.simpleicons.org/spotify/1DB954" width="14" height="14" alt="Spotify" /> Spotify now playing, <img src="https://cdn.simpleicons.org/github" width="14" height="14" alt="GitHub" /> GitHub Issues/PRs, <img src="https://cdn.simpleicons.org/anilist/02A9FF" width="14" height="14" alt="AniList" /> AniList, and <img src="https://cdn.simpleicons.org/trakt/ED1C24" width="14" height="14" alt="Trakt" /> Trakt
- Theme customization, custom CSS, custom tab title/favicon, and presets

## Integrations Setup

- [`INTEGRATIONS_SETUP.md`](./INTEGRATIONS_SETUP.md)

## Build

### Requirements

- **Node.js** 18+
- **npm**
- **Python 3** (for addon packaging script)

### Build Firefox `.xpi` (recommended)

```bash
npm ci
npm run icons:extension
npm run package:extension
```

Output: `terminal-tab-<version>.xpi` at repo root (version from `firefox_addon/manifest.json`).

---

## Credits

This project builds on work from the original repositories:

- [Justheretohack0/Pixel-start](https://github.com/Justheretohack0/Pixel-start)
- [refact0r/re-start](https://github.com/refact0r/re-start)
