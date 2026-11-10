import { describe, expect, it } from 'vitest';
import { spring, track } from './spring';

describe('deterministic motion primitives', () => {
  it('returns the initial value before a spring starts', () => expect(spring(-0.1)).toBe(0));
  it('converges toward the target', () => expect(spring(2)).toBeGreaterThan(0.99));
  it('evaluates a keyframed track independent of call order', () => { const keys = [[0, 0], [1, 10], [2, 4]] as const; const a = track(2.5, keys); track(0.2, keys); const b = track(2.5, keys); expect(a).toBe(b); });
  it('preserves the first value before the first transition', () => expect(track(0.5, [[0, 3], [1, 9]])).toBe(3));
});
