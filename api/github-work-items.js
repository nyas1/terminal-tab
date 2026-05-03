const GITHUB_API_BASE = 'https://api.github.com';

const createFailure = (stage, message, statusCode) => {
  const error = new Error(message);
  error.stage = stage;
  if (statusCode) error.statusCode = statusCode;
  return error;
};

const parseLimit = (value) => {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return 6;
  return Math.min(20, Math.max(1, n));
};

const getToken = () => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw createFailure('missing_env', 'Missing GITHUB_TOKEN environment variable');
  return token;
};

const mapItem = (item) => ({
  id: item.id,
  type: item.pull_request ? 'pr' : 'issue',
  title: item.title || '(untitled)',
  repo: (() => {
    try {
      const parsed = new URL(item.html_url || '');
      const [owner, repo] = parsed.pathname.split('/').filter(Boolean);
      if (!owner || !repo) return 'unknown/repo';
      return `${owner}/${repo}`;
    } catch {
      return 'unknown/repo';
    }
  })(),
  number: item.number || 0,
  url: item.html_url || '#',
  updatedAt: item.updated_at || ''
});

const fetchSearch = async (token, q, perPage) => {
  const url = `${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=${perPage}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (!res.ok) {
    throw createFailure('github_api_failed', `GitHub API request failed: ${res.status}`, res.status);
  }
  const body = await res.json();
  return body?.items || [];
};

export default async function handler(req, res) {
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

  const usernameRaw = String(req.query?.username || '').trim().replace(/^@+/, '');
  if (!usernameRaw) {
    res.status(400).json({ error: 'Bad Request', details: 'Missing required query parameter: username' });
    return;
  }

  const limit = parseLimit(req.query?.limit);

  try {
    const token = getToken();
    const queries = [
      // Open issues/PRs in repositories owned by this account (opened by anyone)
      `is:open is:issue user:${usernameRaw}`,
      `is:open is:pr user:${usernameRaw}`
    ];

    const resultGroups = await Promise.all(
      queries.map((q) => fetchSearch(token, q, limit))
    );

    const merged = resultGroups.flat()
      .map(mapItem)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const deduped = [];
    const seen = new Set();
    for (const item of merged) {
      const key = `${item.type}:${item.repo}#${item.number}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
      if (deduped.length >= limit) break;
    }

    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
    res.status(200).json({ items: deduped });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    res.status(statusCode).json({
      error: 'GitHub unavailable',
      stage: error?.stage || 'unknown',
      details: error?.message || 'Unexpected error',
      statusCode
    });
  }
}
