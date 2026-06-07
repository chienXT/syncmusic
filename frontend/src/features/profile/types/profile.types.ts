export type ProfileSong = {
  _id: string;
  title?: string;
  artist?: string;
  coverArt?: string | null;
  duration?: number;
};

export type ProfileUser = {
  _id: string;
  username: string;
  avatar?: string | null;
  bio?: string;
  status?: string;
  createdAt?: string;
  currentRoom?: {
    _id: string;
    name: string;
    inviteCode?: string;
    isActive?: boolean;
  } | null;
  friends?: Array<{ _id: string }>;
  recentlyPlayed?: ProfileSong[];
  likedSongs?: ProfileSong[];
};
