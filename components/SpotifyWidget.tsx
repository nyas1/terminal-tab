/** Now playing from integration `/api/spotify-now-playing`; optional pixel cover + EQ. */

import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import {
  SPOTIFY_ALBUM_ART_IMG,
  SPOTIFY_ALBUM_ART_SHELL,
  SPOTIFY_ALBUM_PIXEL_GRID,
  SPOTIFY_ART_AREA,
  SPOTIFY_EQ_BAR_COUNT,
  SPOTIFY_WIDGET_POLL_MS
} from '../utils/spotifyWidget/constants';
import {
  formatSpotifyErrorMessage,
  resolveSpotifyApiUrl,
  spotifyFetchNowPlaying
} from '../utils/spotifyWidget/service';
import type { SpotifyApiErrorBody, SpotifyNowPlaying, SpotifyWidgetState } from '../utils/spotifyWidget/types';

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
        canvas.width = SPOTIFY_ALBUM_PIXEL_GRID;
        canvas.height = SPOTIFY_ALBUM_PIXEL_GRID;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setUseOriginal(true);
          return;
        }
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, SPOTIFY_ALBUM_PIXEL_GRID, SPOTIFY_ALBUM_PIXEL_GRID);
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
      <div className={SPOTIFY_ALBUM_ART_SHELL}>
        <img src={src} alt={alt} className={SPOTIFY_ALBUM_ART_IMG} decoding="async" loading="eager" />
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className={`${SPOTIFY_ALBUM_ART_SHELL} rounded-sm bg-[var(--color-hover,#2a2a2a)]${pulseWhileLoading ? ' animate-pulse' : ''}`}
        aria-hidden
      />
    );
  }

  return (
    <div className={SPOTIFY_ALBUM_ART_SHELL}>
      <img src={dataUrl} alt={alt} className={`pixel-album-art ${SPOTIFY_ALBUM_ART_IMG}`} decoding="async" />
    </div>
  );
};

const SpotifyEqBars: React.FC<{ mode: 'playing' | 'idle' }> = ({ mode }) => (
  <div
    className="grid h-4 w-full shrink-0 items-end gap-x-0.5"
    aria-hidden
    style={{ gridTemplateColumns: `repeat(${SPOTIFY_EQ_BAR_COUNT}, minmax(0, 1fr))` }}
  >
    {Array.from({ length: SPOTIFY_EQ_BAR_COUNT }, (_, i) => {
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

export const SpotifyWidget: React.FC = () => {
  const { spotifyPixelAlbumArt, spotifyPulse, integrationApiBaseUrl } = useAppContext();
  const [state, setState] = useState<SpotifyWidgetState>({ status: 'loading' });

  useEffect(() => {
    let isMounted = true;
    const endpoint = resolveSpotifyApiUrl(integrationApiBaseUrl);

    const fetchNowPlaying = async () => {
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
        const data = parsed as SpotifyNowPlaying;
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
    };

    fetchNowPlaying();
    const timer = window.setInterval(fetchNowPlaying, SPOTIFY_WIDGET_POLL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [integrationApiBaseUrl]);

  const content = useMemo(() => {
    if (state.status === 'loading') {
      return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-1">
          <div aria-hidden className="mb-2 shrink-0 opacity-90" style={SPOTIFY_WIDGET_LOGO_MASK_STYLE} />
          <span className="text-xs text-[var(--color-muted,#888888)]">loading…</span>
        </div>
      );
    }

    if (state.status === 'error') {
      return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-1 py-1">
          <div aria-hidden className="mb-2 shrink-0 opacity-90" style={SPOTIFY_WIDGET_LOGO_MASK_STYLE} />
          <span className="text-center text-xs leading-snug text-[var(--color-muted,#888888)]">{state.message}</span>
        </div>
      );
    }

    const { data } = state;
    const hasTrack = Boolean(data.title?.trim() && data.artist?.trim());
    const showNowPlaying = data.isPlaying && hasTrack;

    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2 py-1">
        <div className={SPOTIFY_ART_AREA}>
          {showNowPlaying ? (
            data.albumImageUrl ? (
              spotifyPixelAlbumArt ? (
                <PixelAlbumArt
                  src={data.albumImageUrl}
                  alt={data.album ? `${data.album} cover` : 'album cover'}
                  pulseWhileLoading
                />
              ) : (
                <div className={SPOTIFY_ALBUM_ART_SHELL}>
                  <img
                    src={data.albumImageUrl}
                    alt={data.album ? `${data.album} cover` : 'album cover'}
                    className={SPOTIFY_ALBUM_ART_IMG}
                    decoding="async"
                    loading="eager"
                  />
                </div>
              )
            ) : (
              <span className="text-[10px] text-[var(--color-muted,#888888)]">no art</span>
            )
          ) : (
            <div aria-hidden className="shrink-0 opacity-90" style={SPOTIFY_WIDGET_LOGO_MASK_STYLE} />
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
              <p className="truncate text-base font-bold leading-tight text-[var(--color-fg,#e0e0e0)] sm:text-lg">Spotify</p>
              <p className="mt-0.5 truncate text-xs text-[var(--color-muted,#888888)] sm:text-sm">no music playing</p>
            </>
          )}
        </div>
        {spotifyPulse ? <SpotifyEqBars mode={showNowPlaying ? 'playing' : 'idle'} /> : null}
      </div>
    );
  }, [state, spotifyPixelAlbumArt, spotifyPulse]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-auto pr-1 custom-scrollbar">
      {content}
    </div>
  );
};
