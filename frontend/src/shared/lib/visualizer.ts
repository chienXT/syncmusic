export type ParticleConfig = {
  id: number;
  left: string;
  dur: string;
  delay: string;
  size: string;
  col: 0 | 1 | 2;
  drift: string;
};

export type VizBarConfig = {
  id: number;
  h: string;
  dur: string;
  dly: string;
};

export const createParticles = (count = 24): ParticleConfig[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${(i * 3.9 + 2) % 94}%`,
    dur: `${3.5 + (i * 0.43) % 4.2}s`,
    delay: `-${(i * 0.71) % 5.5}s`,
    size: `${3 + (i % 4)}px`,
    col: (i % 3) as 0 | 1 | 2,
    drift: `${(i % 2 === 0 ? 1 : -1) * (10 + (i % 22))}px`,
  }));

export const createVizBars = (count = 36): VizBarConfig[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    h: `${Math.round(Math.abs(Math.sin(i * 0.54)) * 32 + (i % 6) * 3 + 8)}px`,
    dur: `${0.38 + (i % 8) * 0.08}s`,
    dly: `${(i * 0.04) % 0.8}s`,
  }));
