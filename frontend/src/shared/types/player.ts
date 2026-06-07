export type PlayMode = 'live' | 'free';
export type RepeatMode = 'off' | 'all' | 'one';
export type Panel = 'queue' | 'history' | 'search' | 'lyrics' | 'chat';

export const PLAYER_PANELS: Panel[] = ['queue','history','search','lyrics','chat'];
export const PLAY_MODES: PlayMode[] = ['live','free'];
export const REPEAT_MODES: RepeatMode[] = ['off','all','one'];
