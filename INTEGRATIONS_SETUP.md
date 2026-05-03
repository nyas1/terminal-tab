# Integrations Setup (Extension)

This guide is for the Firefox extension build.

## Shared: Integration API Base URL (Spotify + GitHub)

In the extension, Spotify and GitHub call your deployed API origin.

- Open **Settings -> Advanced -> Integration API -> Base URL**
- Set to your deployed origin (no trailing slash), for example:
  - `https://<your-project>.vercel.app`

## Spotify Now Playing

Server endpoint used by extension: `/api/spotify-now-playing` (`api/spotify-now-playing.js`).

### 1) Create Spotify app

- Open [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- Create app and copy:
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_CLIENT_SECRET`
- Add redirect URI: `http://127.0.0.1:5555/callback`

### 2) Get auth code

Open in browser (replace `YOUR_CLIENT_ID`):

```text
https://accounts.spotify.com/authorize?response_type=code&client_id=YOUR_CLIENT_ID&scope=user-read-currently-playing%20user-read-recently-played&redirect_uri=http%3A%2F%2F127.0.0.1%3A5555%2Fcallback
```

After approval, copy `code` from:

- `http://127.0.0.1:5555/callback?code=...`

### 3) Exchange code for refresh token

Run this in **PowerShell**:

```powershell
$body = @{
  grant_type    = 'authorization_code'
  code          = 'PASTE_CODE_HERE'
  redirect_uri  = 'http://127.0.0.1:5555/callback'
  client_id     = 'YOUR_CLIENT_ID'
  client_secret = 'YOUR_CLIENT_SECRET'
}

Invoke-RestMethod `
  -Method Post `
  -Uri 'https://accounts.spotify.com/api/token' `
  -ContentType 'application/x-www-form-urlencoded' `
  -Body $body
```

Copy `refresh_token` from response.

### 4) Add deploy env vars

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REFRESH_TOKEN`

Redeploy.

### 5) Extension settings

- Enable **Spotify** widget
- Ensure **Integration API -> Base URL** is set

## GitHub Issues & PRs

Server endpoint used by extension: `/api/github-work-items` (`api/github-work-items.js`).

### 1) Add deploy env var

- `GITHUB_TOKEN` (PAT with read access to repos/issues/PRs you want shown)

Redeploy.

### 2) Extension settings

- Enable **GitHub** widget
- Ensure **Integration API -> Base URL** is set
- In **GitHub Widget**, set **GitHub Username**

## AniList

AniList is direct client-side (no server key needed).

- Enable **AniList** widget
- Open **Settings -> Advanced -> AniList Widget**
- Set **AniList Username**

## Trakt

Trakt is direct client-side in the extension.

### 1) Create Trakt app

- Open [Trakt API Apps](https://trakt.tv/oauth/applications)
- Create app and copy:
  - **Client ID**
  - **Client Secret**

### 2) Extension settings

- Enable **Trakt** widget
- Open **Settings -> Advanced -> Trakt Widget**
- Paste **Trakt Client ID** and **Trakt Client Secret**
- Set **TMDB API Key (for posters)** from [TMDB API Settings](https://www.themoviedb.org/settings/api) (required)
- Click **[ CONNECT ]**, open activation URL, enter code

Note: Trakt credentials are stored locally in extension storage.
