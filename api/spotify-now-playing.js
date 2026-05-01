const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENTLY_PLAYED_ENDPOINT = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

const createFailure = (stage, message, statusCode) => {
  const error = new Error(message);
  error.stage = stage;
  if (statusCode) error.statusCode = statusCode;
  return error;
};

const getAccessToken = async () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw createFailure('missing_env', 'Missing Spotify environment variables');
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!tokenRes.ok) {
    throw createFailure('token_exchange_failed', `Spotify token exchange failed: ${tokenRes.status}`, tokenRes.status);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
};

const mapTrack = (item, isPlaying, playedAt) => {
  if (!item) return { isPlaying: false, title: '', artist: '' };
  return {
    isPlaying,
    title: item.name || '',
    artist: (item.artists || []).map((a) => a.name).filter(Boolean).join(', '),
    album: item.album?.name,
    albumImageUrl: item.album?.images?.[0]?.url,
    songUrl: item.external_urls?.spotify,
    playedAt
  };
};

export default async function handler(req, res) {
  // Allow extension pages (moz-extension://...) to read this endpoint.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const accessToken = await getAccessToken();

    const nowPlayingRes = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (nowPlayingRes.status === 200) {
      const nowPlaying = await nowPlayingRes.json();
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(mapTrack(nowPlaying.item, !!nowPlaying.is_playing));
      return;
    }

    if (nowPlayingRes.status === 204 || nowPlayingRes.status === 202) {
      const recentRes = await fetch(RECENTLY_PLAYED_ENDPOINT, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!recentRes.ok) {
        throw createFailure('recently_played_failed', `Spotify recent track fetch failed: ${recentRes.status}`, recentRes.status);
      }

      const recentData = await recentRes.json();
      const recent = recentData?.items?.[0];
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(mapTrack(recent?.track, false, recent?.played_at));
      return;
    }

    throw createFailure('now_playing_failed', `Spotify now playing fetch failed: ${nowPlayingRes.status}`, nowPlayingRes.status);
  } catch (error) {
    res.status(500).json({
      isPlaying: false,
      title: '',
      artist: '',
      error: 'Spotify unavailable',
      stage: error?.stage || 'unknown',
      details: error?.message || 'Unexpected error',
      statusCode: error?.statusCode || null
    });
  }
}
