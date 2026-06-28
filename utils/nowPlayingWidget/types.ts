/** Now playing track state and widget types. */

export type NowPlayingTrackState = {
  isPlaying: boolean;
  title: string;
  artist: string;
  album?: string;
  albumImageUrl?: string;
  songUrl?: string;
  playedAt?: string;
};

export type SpotifyApiErrorBody = {
  error?: string;
  details?: string;
  stage?: string;
};

export type NowPlayingWidgetState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: NowPlayingTrackState };
