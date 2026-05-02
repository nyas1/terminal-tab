

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

## Spotify Now Playing

Widget → **`/api/spotify-now-playing`** (`api/spotify-now-playing.js` on Vercel: `https://<your-project>.vercel.app/api/spotify-now-playing`).

Get a **refresh token**, then set three env vars on Vercel.

### 1. Create a Spotify app

- Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
- Click **Create app** and note **Client ID** and **Client Secret**.
- **Redirect URIs**: `http://127.0.0.1:5555/callback`

### 2. Get an authorization `code`

- Replace `YOUR_CLIENT_ID` in this URL, then open it in a browser:

  ```
  https://accounts.spotify.com/authorize?response_type=code&client_id=YOUR_CLIENT_ID&scope=user-read-currently-playing%20user-read-recently-played&redirect_uri=http%3A%2F%2F127.0.0.1%3A5555%2Fcallback
  ```

- Log in and approve.
- From `http://127.0.0.1:5555/callback?code=...`, copy the **`code`** query value (before it expires).

### 3. Exchange `code` for a `refresh_token`

- Replace placeholders (`redirect_uri` must match step 1):

  ```bash
  curl -s -X POST "https://accounts.spotify.com/api/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=authorization_code" \
    -d "code=PASTE_CODE_HERE" \
    -d "redirect_uri=http://127.0.0.1:5555/callback" \
    -d "client_id=YOUR_CLIENT_ID" \
    -d "client_secret=YOUR_CLIENT_SECRET"
  ```

- Copy **`refresh_token`** from the JSON.

### 4. Add secrets on Vercel

- In the Vercel project: **Settings** → **Environment Variables**.
- Add:

  - `SPOTIFY_CLIENT_ID` — from the Spotify app
  - `SPOTIFY_CLIENT_SECRET` — from the Spotify app
  - `SPOTIFY_REFRESH_TOKEN` — from the JSON in step 3

- Save and **redeploy**.

### 5. Firefox extension

- **Settings** → **Advanced** → enable **Spotify**.
- Set **Spotify API base URL** to `https://<your-project>.vercel.app` (no trailing slash).


## Build

### Requirements

- **Node.js** 18 or newer
- **npm**
- **Python 3**

### Web app

- Install and build:

  ```bash
  npm install
  npm run build
  ```

- Output: **`dist/`**

### Firefox `.xpi`

- **Listed build:** [Terminal Tab on addons.mozilla.org](https://addons.mozilla.org/en-US/firefox/addon/terminal-newtab/)
- Requires **Firefox 140+** (desktop) / **142+** (Android) for this manifest (built-in data-collection consent).

**One-shot build (recommended):**

```bash
npm ci
npm run icons:extension
npm run package:extension
```

This runs, in order: TypeScript + Vite (`--mode extension`), syncs **`dist/assets/`** into **`firefox_addon/assets/`**, updates hashed **`index-*.js` / `index-*.css`** in **`firefox_addon/newtab.html`** from **`dist/index.html`**, runs **`package_addon.py`** (syncs boot scripts from **`public/`**, zips **`firefox_addon/`**).

Output: **`terminal-tab-<version>.xpi`** at the repo root (version from **`firefox_addon/manifest.json`**).

**Icons:** Run **`npm run icons:extension`** again only after changing **`firefox_addon/icon-terminal-tab.svg`**.

---
