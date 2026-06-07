import type { ProfileSong } from '../types/profile.types';

type ProfileMiniSongRowProps = {
  song: ProfileSong;
};

export default function ProfileMiniSongRow({ song }: ProfileMiniSongRowProps) {
  return (
    <div className="profile-song-row">
      <div className="profile-song-cover">
        {song.coverArt ? <img src={song.coverArt} alt={song.title || 'song cover'} /> : <span>♪</span>}
      </div>
      <div className="profile-song-meta">
        <strong>{song.title || 'Untitled'}</strong>
        <span>{song.artist || 'Unknown artist'}</span>
      </div>
      <div className="profile-song-badge">
        {song.duration ? `${Math.floor(song.duration / 60)}:${String(Math.floor(song.duration % 60)).padStart(2, '0')}` : '—'}
      </div>
    </div>
  );
}
