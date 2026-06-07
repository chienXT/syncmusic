export interface Song {
  _id?: string;
  id?: string;
  sourceId?: string;
  title: string;
  artist?: string;
  album?: string;
  duration: number;
  coverArt?: string;
  thumbnail?: string;
  audioUrl?: string;
  source?: 'youtube' | 'spotify' | 'upload' | 'external';
  views?: number;
  verified?: boolean;
  score?: number;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
