const TRAKT_API_BASE = 'https://api.trakt.tv';

const ALLOWED_PATHS = [
  /^\/users\/me\/watching$/,
  /^\/users\/me\/watched\/shows\?extended=noseasons$/,
  /^\/users\/me\/progress\/watched\?hidden=false&specials=false&count_specials=false$/,
  /^\/sync\/playback$/,
  /^\/sync\/playback\/episodes$/,
  /^\/shows\/[^/?#]+\?extended=full,images$/
];

const setCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const parseBody = (req) => {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
};

const isAllowedPath = (path) => ALLOWED_PATHS.some((rx) => rx.test(path));

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const clientId = String(process.env.TRAKT_CLIENT_ID || '').trim();
  if (!clientId) return res.status(500).json({ error: 'Missing TRAKT_CLIENT_ID on server.' });

  const body = parseBody(req);
  const path = String(body?.path || '').trim();
  const accessToken = String(body?.accessToken || '').trim();
  if (!path || !isAllowedPath(path)) {
    return res.status(400).json({ error: 'Path not allowed.' });
  }
  if (!accessToken) return res.status(401).json({ error: 'accessToken is required.' });

  try {
    const upstream = await fetch(`${TRAKT_API_BASE}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': clientId,
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (upstream.status === 204) return res.status(204).end();

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    return res.send(text);
  } catch (error) {
    return res.status(500).json({ error: 'Trakt proxy server error.', details: error instanceof Error ? error.message : 'unknown' });
  }
}
