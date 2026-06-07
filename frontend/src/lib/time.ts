export const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const nowMs = () => Date.now();

export const driftCompensatedTime = (serverTimestamp: number, localOffsetMs: number) =>
  Math.max(0, (nowMs() - serverTimestamp) / 1000 + localOffsetMs / 1000);
