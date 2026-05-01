import React, { useEffect, useMemo, useState } from 'react';

type SpotifyNowPlaying = {
  isPlaying: boolean;
  title: string;
  artist: string;
  album?: string;
  albumImageUrl?: string;
  songUrl?: string;
  playedAt?: string;
};

type WidgetState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: SpotifyNowPlaying };

const getEndpoint = () => {
  const envBase = (import.meta.env.VITE_SPOTIFY_API_BASE_URL || '').trim();
  const configuredBase = envBase.replace(/\/+$/, '');
  if (configuredBase) {
    return `${configuredBase}/api/spotify-now-playing`;
  }
  return '/api/spotify-now-playing';
};

const formatPlayedAt = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `Last played ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

export const SpotifyWidget: React.FC = () => {
  const [state, setState] = useState<WidgetState>({ status: 'loading' });

  useEffect(() => {
    let isMounted = true;
    const endpoint = getEndpoint();

    const fetchNowPlaying = async () => {
      try {
        const res = await fetch(endpoint, { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }
        const data = (await res.json()) as SpotifyNowPlaying;
        if (!isMounted) return;
        setState({ status: 'success', data });
      } catch (_error) {
        if (!isMounted) return;
        const isExtension = window.location.protocol === 'moz-extension:';
        setState({
          status: 'error',
          message: isExtension ? 'set VITE_SPOTIFY_API_BASE_URL for extension build' : 'spotify unavailable'
        });
      }
    };

    fetchNowPlaying();
    const timer = window.setInterval(fetchNowPlaying, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const content = useMemo(() => {
    if (state.status === 'loading') {
      return <div className="text-xs text-[var(--color-muted)]">loading spotify...</div>;
    }

    if (state.status === 'error') {
      return <div className="text-xs text-[var(--color-muted)]">{state.message}</div>;
    }

    const { data } = state;
    if (!data.title || !data.artist) {
      return <div className="text-xs text-[var(--color-muted)]">nothing played yet</div>;
    }

    return (
      <div className="w-full h-full flex gap-3 items-center">
        {data.albumImageUrl ? (
          <img
            src={data.albumImageUrl}
            alt={data.album ? `${data.album} cover` : 'album cover'}
            className="w-14 h-14 border border-[var(--color-border)] object-cover flex-shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-14 h-14 border border-[var(--color-border)] text-[10px] text-[var(--color-muted)] flex items-center justify-center flex-shrink-0">
            no art
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="text-xs text-[var(--color-accent)] mb-1">
            {data.isPlaying ? 'Now Playing' : 'Recently Played'}
          </div>
          <div className="font-mono text-sm text-[var(--color-fg)] truncate">{data.title}</div>
          <div className="font-mono text-xs text-[var(--color-muted)] truncate">{data.artist}</div>
          {data.songUrl ? (
            <a
              href={data.songUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs text-[var(--color-accent)] hover:underline mt-1"
            >
              open in spotify
            </a>
          ) : null}
          {!data.isPlaying && data.playedAt ? (
            <div className="text-[10px] text-[var(--color-muted)] mt-1">{formatPlayedAt(data.playedAt)}</div>
          ) : null}
        </div>
      </div>
    );
  }, [state]);

  return <div className="w-full h-full px-2 py-1 overflow-hidden">{content}</div>;
};
