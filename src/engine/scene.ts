export type SceneId = 'type' | 'product' | 'science' | 'genesis' | 'generated';
export type SceneDefinition = { id: SceneId; title: string; category: string; duration: number; description: string };
export interface SeekableScene { readonly definition: SceneDefinition; seek(timeSeconds: number): void; dispose(): void; }
export const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));
export const smoothstep = (edge0: number, edge1: number, x: number): number => { const t = clamp((x-edge0)/(edge1-edge0)); return t*t*(3-2*t); };
export const easeOutCubic = (x: number): number => 1-Math.pow(1-clamp(x),3);
export function seededRandom(seed: number): () => number { let state = seed >>> 0; return () => { state = (state + 0x6D2B79F5) >>> 0; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
