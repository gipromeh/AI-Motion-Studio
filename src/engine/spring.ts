import { clamp } from './scene';

/** Closed-form underdamped/critically damped spring response to a unit step. */
export function spring(time: number, stiffness = 170, damping = 26): number {
  if (time <= 0) return 0;
  const w0 = Math.sqrt(stiffness);
  const zeta = damping / (2 * w0);
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * time) * (Math.cos(wd * time) + (zeta * w0 / wd) * Math.sin(wd * time));
  }
  return 1 - Math.exp(-w0 * time) * (1 + w0 * time);
}

/** Piecewise target track. Each target change contributes an independent spring. */
export function track(time: number, keys: readonly (readonly [number, number])[], stiffness = 170, damping = 26): number {
  if (keys.length === 0) return 0;
  let value = keys[0][1];
  for (let i = 1; i < keys.length; i++) value += (keys[i][1] - keys[i - 1][1]) * spring(time - keys[i][0], stiffness, damping);
  return value;
}

export function fadeWindow(time: number, start: number, end: number, fade = 0.25): number {
  if (end <= start) return 0;
  return clamp(Math.min((time - start) / fade, (end - time) / fade));
}
