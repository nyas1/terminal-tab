/** Now playing from integration `/api/spotify-now-playing` or client-side Last.fm; optional pixel cover + EQ. */

import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import {
  NOW_PLAYING_ALBUM_ART_IMG,
  NOW_PLAYING_ALBUM_ART_SHELL,
  NOW_PLAYING_ALBUM_PIXEL_GRID,
  NOW_PLAYING_ART_AREA,
  NOW_PLAYING_EQ_BAR_COUNT,
  NOW_PLAYING_WIDGET_POLL_MS
} from '../utils/nowPlayingWidget/constants';
import {
  formatSpotifyErrorMessage,
  resolveSpotifyApiUrl,
  spotifyFetchNowPlaying
} from '../utils/nowPlayingWidget/service';
import type { SpotifyApiErrorBody, NowPlayingTrackState, NowPlayingWidgetState } from '../utils/nowPlayingWidget/types';

const SPOTIFY_WIDGET_LOGO_SRC = '/images/spotify-widget.png';
const SPOTIFY_WIDGET_LOGO_MASK_STYLE: React.CSSProperties = {
  width: '7.8rem',
  height: '7.8rem',
  backgroundColor: 'var(--color-accent)',
  WebkitMaskImage: `url(${SPOTIFY_WIDGET_LOGO_SRC})`,
  maskImage: `url(${SPOTIFY_WIDGET_LOGO_SRC})`,
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
  maskMode: 'luminance'
};

/**
 * Downscale cover to a tiny bitmap (nearest-neighbor); falls back to raw img if canvas is tainted.
 */
const PixelAlbumArt: React.FC<{ src: string; alt: string; pulseWhileLoading: boolean }> = ({
  src,
  alt,
  pulseWhileLoading
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [useOriginal, setUseOriginal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    setUseOriginal(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = NOW_PLAYING_ALBUM_PIXEL_GRID;
        canvas.height = NOW_PLAYING_ALBUM_PIXEL_GRID;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setUseOriginal(true);
          return;
        }
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, NOW_PLAYING_ALBUM_PIXEL_GRID, NOW_PLAYING_ALBUM_PIXEL_GRID);
        setDataUrl(canvas.toDataURL('image/png'));
      } catch {
        if (!cancelled) setUseOriginal(true);
      }
    };
    img.onerror = () => {
      if (!cancelled) setUseOriginal(true);
    };
    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (useOriginal) {
    return (
      <div className={NOW_PLAYING_ALBUM_ART_SHELL}>
        <img src={src} alt={alt} className={NOW_PLAYING_ALBUM_ART_IMG} decoding="async" loading="eager" />
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className={`${NOW_PLAYING_ALBUM_ART_SHELL} rounded-sm bg-[var(--color-hover,#2a2a2a)]${pulseWhileLoading ? ' animate-pulse' : ''}`}
        aria-hidden
      />
    );
  }

  return (
    <div className={NOW_PLAYING_ALBUM_ART_SHELL}>
      <img src={dataUrl} alt={alt} className={`pixel-album-art ${NOW_PLAYING_ALBUM_ART_IMG}`} decoding="async" />
    </div>
  );
};

const NowPlayingEqBars: React.FC<{ mode: 'playing' | 'idle' }> = ({ mode }) => (
  <div
    className="grid h-4 w-full shrink-0 items-end gap-x-0.5"
    aria-hidden
    style={{ gridTemplateColumns: `repeat(${NOW_PLAYING_EQ_BAR_COUNT}, minmax(0, 1fr))` }}
  >
    {Array.from({ length: NOW_PLAYING_EQ_BAR_COUNT }, (_, i) => {
      const phase = i % 5;
      return (
        <div key={i} className="flex min-w-0 justify-center">
          <span
            className={`spotify-eq-bar ${mode === 'playing' ? 'spotify-eq-bar--playing' : 'spotify-eq-bar--idle'}`}
            style={{
              animationDelay: `${i * 0.035}s`,
              animationDuration: `${mode === 'playing' ? 0.38 + phase * 0.05 + (i % 3) * 0.04 : 0.85 + phase * 0.08}s`
            }}
          />
        </div>
      );
    })}
  </div>
);

const WidgetLogo: React.FC<{ provider: 'spotify' | 'lastfm' }> = ({ provider }) => {
  if (provider === 'lastfm') {
    return (
      <svg
        viewBox="0 0 64 64"
        className="w-[7.8rem] h-[7.8rem] text-[var(--color-accent)] shrink-0 opacity-90"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M51.781 29.4c-5.008-1.5-6.811-2.3-6.811-4 0-2.8 4.006-3.4 4.407-3.5 2.5-.4 6.71.3 7.812 3.7L64 23.5c-2.1-6.8-9.515-9.4-15.725-8.5-6.31.9-10.516 5.1-10.516 10.4 0 7.1 6.911 9.2 11.919 10.6 5.308 1.6 7.111 2.5 7.111 4.4 0 1.6-1.3 2.4-3.906 3.1-5.108 1.3-12.019 0-13.822-3.1a46.86 46.86 0 0 1-3.1-7c-3-8-7.211-18.9-19.23-18.9C10.516 14.6 0 17.1 0 34.2 0 41.3 5.108 51 16.526 51c9.615 0 11.218-3.9 11.618-4.6l-3.1-6.1a11.332 11.332 0 0 1-8.518 3.7c-9.014 0-9.415-9.7-9.415-9.8 0-8.9 2.9-12.6 9.615-12.6 6.61 0 9.214 5.7 12.52 14.3a46.877 46.877 0 0 0 3.605 8.1c3 4.9 9.815 7 16.326 7a20.047 20.047 0 0 0 5.609-.7c5.709-1.5 9.214-5 9.214-9.8 0-7.4-7.011-9.5-12.219-11.1z" />
      </svg>
    );
  }
  return <div aria-hidden className="shrink-0 opacity-90" style={SPOTIFY_WIDGET_LOGO_MASK_STYLE} />;
};

export const NowPlayingWidget: React.FC = () => {
  const {
    spotifyPixelAlbumArt,
    spotifyPulse,
    integrationApiBaseUrl,
    nowPlayingProvider,
    lastfmUsername,
    lastfmApiKey
  } = useAppContext();
  const [state, setState] = useState<NowPlayingWidgetState>({ status: 'loading' });

  useEffect(() => {
    let isMounted = true;
    let timer: number | null = null;

    const fetchNowPlaying = async () => {
      if (nowPlayingProvider === 'spotify') {
        const endpoint = resolveSpotifyApiUrl(integrationApiBaseUrl);
        const isExtension = window.location.protocol === 'moz-extension:';
        try {
          const res = await spotifyFetchNowPlaying(endpoint);
          let parsed: unknown = null;
          try {
            parsed = await res.json();
          } catch {
            parsed = null;
          }
          if (!res.ok) {
            const body = parsed && typeof parsed === 'object' ? (parsed as SpotifyApiErrorBody) : null;
            if (!isMounted) return;
            setState({
              status: 'error',
              message: formatSpotifyErrorMessage(endpoint, res.status, body, isExtension)
            });
            return;
          }
          const data = parsed as NowPlayingTrackState;
          if (!isMounted) return;
          setState({ status: 'success', data });
        } catch (err) {
          if (!isMounted) return;
          const base = formatSpotifyErrorMessage(endpoint, null, null, isExtension);
          const extra = err instanceof Error ? err.message : '';
          setState({
            status: 'error',
            message: extra ? `${base} (${extra})` : base
          });
        }
      } else {
        // Last.fm API
        if (!lastfmUsername.trim() || !lastfmApiKey.trim()) {
          if (!isMounted) return;
          setState({
            status: 'error',
            message: 'Set Username and API Key in settings.'
          });
          return;
        }

        try {
          const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(lastfmUsername)}&api_key=${encodeURIComponent(lastfmApiKey)}&format=json&limit=1`;
          const res = await fetch(url);
          if (!res.ok) {
            if (!isMounted) return;
            setState({
              status: 'error',
              message: `Last.fm error (${res.status})`
            });
            return;
          }
          const parsed = await res.json();
          if (parsed && typeof parsed === 'object' && 'error' in parsed) {
            if (!isMounted) return;
            setState({
              status: 'error',
              message: `Last.fm error: ${parsed.message || 'API error'}`
            });
            return;
          }

          let track: any = null;
          const recentTracks = parsed?.recenttracks?.track;
          if (Array.isArray(recentTracks) && recentTracks.length > 0) {
            track = recentTracks[0];
          } else if (recentTracks && typeof recentTracks === 'object' && !Array.isArray(recentTracks)) {
            track = recentTracks;
          }

          if (!track) {
            if (!isMounted) return;
            setState({
              status: 'success',
              data: { isPlaying: false, title: '', artist: '' }
            });
            return;
          }

          const isPlaying = track['@attr']?.nowplaying === 'true';
          const title = track.name || '';
          const artist = track.artist?.['#text'] || '';
          const album = track.album?.['#text'] || '';
          
          let albumImageUrl = '';
          if (Array.isArray(track.image)) {
            const xl = track.image.find((img: any) => img.size === 'extralarge');
            const lg = track.image.find((img: any) => img.size === 'large');
            const med = track.image.find((img: any) => img.size === 'medium');
            albumImageUrl = xl?.['#text'] || lg?.['#text'] || med?.['#text'] || '';
          }
          const songUrl = track.url || '';

          if (!isMounted) return;
          setState({
            status: 'success',
            data: {
              isPlaying,
              title,
              artist,
              album,
              albumImageUrl,
              songUrl
            }
          });
        } catch (err) {
          if (!isMounted) return;
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Failed to query Last.fm'
          });
        }
      }
    };

    fetchNowPlaying();
    timer = window.setInterval(fetchNowPlaying, NOW_PLAYING_WIDGET_POLL_MS);

    return () => {
      isMounted = false;
      if (timer) window.clearInterval(timer);
    };
  }, [integrationApiBaseUrl, nowPlayingProvider, lastfmUsername, lastfmApiKey]);

  const content = useMemo(() => {
    if (state.status === 'loading') {
      return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-1">
          <WidgetLogo provider={nowPlayingProvider} />
          <span className="text-xs text-[var(--color-muted,#888888)] mt-2">loading…</span>
        </div>
      );
    }

    if (state.status === 'error') {
      return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-1 py-1">
          <WidgetLogo provider={nowPlayingProvider} />
          <span className="text-center text-xs leading-snug text-[var(--color-muted,#888888)] mt-2">{state.message}</span>
        </div>
      );
    }

    const { data } = state;
    const hasTrack = Boolean(data.title?.trim() && data.artist?.trim());
    const showNowPlaying = data.isPlaying && hasTrack;

    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2 py-1">
        <div className={NOW_PLAYING_ART_AREA}>
          {showNowPlaying ? (
            data.albumImageUrl ? (
              spotifyPixelAlbumArt ? (
                <PixelAlbumArt
                  src={data.albumImageUrl}
                  alt={data.album ? `${data.album} cover` : 'album cover'}
                  pulseWhileLoading
                />
              ) : (
                <div className={NOW_PLAYING_ALBUM_ART_SHELL}>
                  <img
                    src={data.albumImageUrl}
                    alt={data.album ? `${data.album} cover` : 'album cover'}
                    className={NOW_PLAYING_ALBUM_ART_IMG}
                    decoding="async"
                    loading="eager"
                  />
                </div>
              )
            ) : (
              <span className="text-[10px] text-[var(--color-muted,#888888)]">no art</span>
            )
          ) : (
            <WidgetLogo provider={nowPlayingProvider} />
          )}
        </div>
        <div className="w-full shrink-0 text-center">
          {showNowPlaying ? (
            <>
              <p className="truncate text-base font-bold leading-tight text-[var(--color-fg,#e0e0e0)] sm:text-lg">{data.title}</p>
              <p className="mt-0.5 truncate font-mono text-xs text-[var(--color-muted,#888888)] sm:text-sm">{data.artist}</p>
            </>
          ) : (
            <>
              <p className="truncate text-base font-bold leading-tight text-[var(--color-fg,#e0e0e0)] sm:text-lg">
                {nowPlayingProvider === 'spotify' ? 'Spotify' : 'Last.fm'}
              </p>
              <p className="mt-0.5 truncate text-xs text-[var(--color-muted,#888888)] sm:text-sm">no music playing</p>
            </>
          )}
        </div>
        {spotifyPulse ? <NowPlayingEqBars mode={showNowPlaying ? 'playing' : 'idle'} /> : null}
      </div>
    );
  }, [state, spotifyPixelAlbumArt, spotifyPulse, nowPlayingProvider]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-auto pr-1 custom-scrollbar">
      {content}
    </div>
  );
};
