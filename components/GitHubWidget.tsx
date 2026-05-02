import React, { useEffect, useMemo, useState } from 'react';
import { GitPullRequestIcon, IssueOpenedIcon } from '@primer/octicons-react';
import { useAppContext } from '../contexts/AppContext';

type GitHubItem = {
  id: number;
  type: 'issue' | 'pr';
  title: string;
  repo: string;
  number: number;
  url: string;
  updatedAt: string;
};

type WidgetState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; items: GitHubItem[] };

const LIMIT = 6;
type ItemFilter = 'all' | 'issue' | 'pr';

type GitHubApiErrorBody = {
  error?: string;
  details?: string;
  stage?: string;
};

const getRepoFromHtmlUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    const [owner, repo] = parsed.pathname.split('/').filter(Boolean);
    if (!owner || !repo) return 'unknown/repo';
    return `${owner}/${repo}`;
  } catch {
    return 'unknown/repo';
  }
};

const getRelativeAge = (updatedAt: string): string => {
  const t = new Date(updatedAt).getTime();
  if (Number.isNaN(t)) return '';
  const diffMs = Date.now() - t;
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.floor(diffHr / 24)}d`;
};

const mapItem = (item: any): GitHubItem => ({
  id: item.id,
  type: item.type === 'issue' || item.type === 'pr' ? item.type : (item.pull_request ? 'pr' : 'issue'),
  title: item.title || '(untitled)',
  repo: item.repo || getRepoFromHtmlUrl(item.html_url || ''),
  number: item.number || 0,
  url: item.url || item.html_url || '#',
  updatedAt: item.updatedAt || item.updated_at || ''
});

const normalizeUserApiOrigin = (raw: string): string => {
  let s = raw.trim().replace(/\/+$/, '');
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  return s.replace(/\/+$/, '');
};

const resolveGithubApiUrl = (userBase: string, username: string) => {
  const base = normalizeUserApiOrigin(userBase);
  const qs = `username=${encodeURIComponent(username)}&limit=${LIMIT}`;
  const apiPath = `/api/github-work-items?${qs}`;
  if (base) {
    // Accept either origin ("https://site") or full endpoint URL pasted by user.
    if (/\/api\/github-work-items(?:\?|$)/i.test(base)) {
      const withNoTrailingParams = base.replace(/[?&]username=[^&]*/i, '').replace(/[?&]limit=[^&]*/i, '').replace(/[?&]$/, '');
      const joiner = withNoTrailingParams.includes('?') ? '&' : '?';
      return `${withNoTrailingParams}${joiner}${qs}`;
    }
    return `${base}${apiPath}`;
  }
  return apiPath;
};

const resolveSameOriginGithubApiUrl = (username: string) =>
  `/api/github-work-items?username=${encodeURIComponent(username)}&limit=${LIMIT}`;

export const GitHubWidget: React.FC = () => {
  const { githubUsername, integrationApiBaseUrl } = useAppContext();
  const [state, setState] = useState<WidgetState>({ status: 'loading' });
  const [filter, setFilter] = useState<ItemFilter>('all');

  useEffect(() => {
    let alive = true;
    const username = githubUsername.trim().replace(/^@+/, '');

    if (!username) {
      setState({ status: 'error', message: 'GitHub: set username in Settings -> Advanced.' });
      return;
    }
    const fetchItems = async () => {
      try {
        const isExtension = window.location.protocol === 'moz-extension:';
        const endpoint = resolveGithubApiUrl(integrationApiBaseUrl, username);
        const issuesRes = await (async () => {
          try {
            return await fetch(endpoint, { cache: 'no-store' });
          } catch (err) {
            // In strict browser privacy modes, cross-origin requests can fail with
            // generic NetworkError. Retry same-origin /api on localhost dev.
            const isLocalhost = /^localhost$|^127\.0\.0\.1$/.test(window.location.hostname);
            const fallback = resolveSameOriginGithubApiUrl(username);
            if (!isLocalhost || endpoint === fallback) throw err;
            return await fetch(fallback, { cache: 'no-store' });
          }
        })();

        if (!issuesRes.ok) {
          const failed = issuesRes;
          const status = failed.status;
          let parsed: GitHubApiErrorBody | null = null;
          try {
            const body = await failed.json();
            if (body && typeof body === 'object') parsed = body as GitHubApiErrorBody;
          } catch {
            parsed = null;
          }
          if (isExtension && !/^https?:\/\//i.test(integrationApiBaseUrl.trim())) {
            throw new Error('set Integration API base URL in Settings -> Advanced.');
          }
          if (status === 404) throw new Error('no /api route here — set Integration API base URL.');
          if (parsed?.stage === 'missing_env') throw new Error('server missing GITHUB_TOKEN env var.');
          if (parsed?.details) throw new Error(parsed.details);
          throw new Error(`GitHub API route error (${status})`);
        }
        const merged = ((await issuesRes.json())?.items || []).map(mapItem);

        const deduped: GitHubItem[] = [];
        const seen = new Set<string>();
        for (const item of merged) {
          const key = `${item.type}:${item.repo}#${item.number}`;
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(item);
          if (deduped.length >= LIMIT) break;
        }

        if (!alive) return;
        setState({ status: 'success', items: deduped });
      } catch (err) {
        if (!alive) return;
        const msg = err instanceof Error ? err.message : 'unknown error';
        setState({ status: 'error', message: `GitHub: ${msg}` });
      }
    };

    setState({ status: 'loading' });
    fetchItems();
    const timer = window.setInterval(fetchItems, 90000);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [integrationApiBaseUrl, githubUsername]);

  const content = useMemo(() => {
    if (state.status === 'loading') {
      return <p className="text-xs text-[var(--color-muted,#888888)]">loading...</p>;
    }
    if (state.status === 'error') {
      return <p className="text-xs leading-snug text-[var(--color-muted,#888888)]">{state.message}</p>;
    }
    if (state.items.length === 0) {
      return <p className="text-xs text-[var(--color-muted,#888888)]">No open issues or PRs found in repositories owned by this user.</p>;
    }

    const filteredItems =
      filter === 'all' ? state.items : state.items.filter((item) => item.type === filter);

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          {(['all', 'issue', 'pr'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`border px-1.5 py-0.5 text-[10px] font-mono no-radius ${
                filter === option
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]'
              }`}
            >
              [{option === 'all' ? 'ALL' : option === 'issue' ? 'ISSUES' : 'PRS'}]
            </button>
          ))}
        </div>
        {filteredItems.length === 0 ? (
          <p className="text-xs text-[var(--color-muted,#888888)]">No items for this filter.</p>
        ) : (
          <ul className="space-y-2">
            {filteredItems.map((item) => (
          <li key={`${item.type}-${item.id}`}>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="block hover:text-[var(--color-accent)]"
              title={item.title}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] text-[var(--color-muted,#888888)]">
                  {item.type === 'pr' ? (
                    <GitPullRequestIcon size={14} className="shrink-0 text-[var(--color-accent)]" />
                  ) : (
                    <IssueOpenedIcon size={14} className="shrink-0 text-[var(--color-accent)]" />
                  )}
                  <span className="truncate">
                    {item.repo} #{item.number}
                  </span>
                </span>
                <span className="font-mono text-[10px] text-[var(--color-muted,#888888)]">{getRelativeAge(item.updatedAt)}</span>
              </div>
              <p className="truncate text-xs text-[var(--color-fg,#e0e0e0)]">{item.title}</p>
            </a>
          </li>
            ))}
          </ul>
        )}
      </div>
    );
  }, [filter, state]);

  return <div className="h-full overflow-auto pr-1 custom-scrollbar">{content}</div>;
};
