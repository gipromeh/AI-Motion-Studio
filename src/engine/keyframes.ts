export type Keyframe = { id: string; time: number; value: number };

export function sortKeyframes(keys: readonly Keyframe[]): Keyframe[] { return [...keys].sort((a, b) => a.time - b.time || a.id.localeCompare(b.id)); }

/** Linear interpolation with endpoint hold; independent of previous seek calls. */
export function evaluateTrack(time: number, keys: readonly Keyframe[], fallback = 0): number {
  if (keys.length === 0) return fallback;
  const sorted = sortKeyframes(keys);
  if (time <= sorted[0].time) return sorted[0].value;
  const last = sorted[sorted.length - 1];
  if (time >= last.time) return last.value;
  for (let i = 1; i < sorted.length; i++) {
    const right = sorted[i], left = sorted[i - 1];
    if (time <= right.time) { const span = right.time - left.time; if (span <= 0) return right.value; const t = (time - left.time) / span; return left.value + (right.value - left.value) * t; }
  }
  return last.value;
}

export function upsertKeyframe(keys: readonly Keyframe[], key: Keyframe): Keyframe[] { return sortKeyframes([...keys.filter(item => Math.abs(item.time - key.time) > 1e-6), key]); }
export function removeKeyframe(keys: readonly Keyframe[], id: string): Keyframe[] { return keys.filter(key => key.id !== id); }
