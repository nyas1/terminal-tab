const TRAKT_API_BASE = 'https://api.trakt.tv';

const json = (res, status, body) => {
  res.status(status).json(body);
};

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

const traktOAuthHeaders = (clientId) => ({
  'Content-Type': 'application/json',
  'trakt-api-version': '2',
  'trakt-api-key': clientId
});

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  const clientId = String(process.env.TRAKT_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.TRAKT_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) {
    return json(res, 500, { error: 'Missing TRAKT_CLIENT_ID/TRAKT_CLIENT_SECRET on server.' });
  }

  const action = String(req.query?.action || '').trim();
  const body = parseBody(req);

  try {
    if (action === 'device-code') {
      const upstream = await fetch(`${TRAKT_API_BASE}/oauth/device/code`, {
        method: 'POST',
        headers: traktOAuthHeaders(clientId),
        body: JSON.stringify({ client_id: clientId })
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) return json(res, upstream.status, data);
      return json(res, 200, {
        device_code: String(data?.device_code || ''),
        user_code: String(data?.user_code || ''),
        verification_url: String(data?.verification_url || 'https://trakt.tv/activate'),
        expires_in: Number(data?.expires_in || 600),
        interval: Number(data?.interval || 5)
      });
    }

    if (action === 'device-token') {
      const deviceCode = String(body?.deviceCode || '').trim();
      if (!deviceCode) return json(res, 400, { error: 'deviceCode is required.' });
      const upstream = await fetch(`${TRAKT_API_BASE}/oauth/device/token`, {
        method: 'POST',
        headers: traktOAuthHeaders(clientId),
        body: JSON.stringify({
          code: deviceCode,
          client_id: clientId,
          client_secret: clientSecret
        })
      });
      const data = await upstream.json().catch(() => ({}));
      if (upstream.ok) {
        return json(res, 200, {
          status: 'authorized',
          access_token: String(data?.access_token || ''),
          refresh_token: String(data?.refresh_token || ''),
          expires_in: Number(data?.expires_in || 3600)
        });
      }
      const errorCode = String(data?.error || '');
      if (errorCode === 'authorization_pending' || errorCode === 'slow_down') {
        return json(res, 200, { status: 'pending', error: errorCode });
      }
      if (errorCode === 'expired_token' || errorCode === 'access_denied') {
        return json(res, 200, { status: 'denied', error: errorCode, error_description: data?.error_description || '' });
      }
      return json(res, upstream.status, data);
    }

    if (action === 'refresh') {
      const refreshToken = String(body?.refreshToken || '').trim();
      if (!refreshToken) return json(res, 400, { error: 'refreshToken is required.' });
      const upstream = await fetch(`${TRAKT_API_BASE}/oauth/token`, {
        method: 'POST',
        headers: traktOAuthHeaders(clientId),
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: 'urn:ietf:wg:oauth:2.0:oob'
        })
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) return json(res, upstream.status, data);
      return json(res, 200, {
        access_token: String(data?.access_token || ''),
        refresh_token: String(data?.refresh_token || refreshToken),
        expires_in: Number(data?.expires_in || 3600)
      });
    }

    return json(res, 400, { error: 'Unsupported action.' });
  } catch (error) {
    return json(res, 500, { error: 'Trakt auth server error.', details: error instanceof Error ? error.message : 'unknown' });
  }
}
