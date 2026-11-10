import { describe, expect, it } from 'vitest';
import { generateProceduralScene } from './proceduralDirector';

describe('procedural director', () => {
  it('creates a validated product composition without a model', () => {
    const scene = generateProceduralScene('Create a 15-second cinematic product film with a glass lens and three luminous rings. Camera push in. Final title reads OPTICS 2030.');
    expect(scene.duration).toBe(15);
    expect(scene.title).toBe('OPTICS 2030');
    expect(scene.objects.some(object => object.id === 'hero-object')).toBe(true);
    expect(scene.objects.filter(object => object.id.startsWith('orbit-'))).toHaveLength(3);
  });

  it('understands Russian prompts and clamps duration', () => {
    const scene = generateProceduralScene('Сделай 45 секунд: золотое кольцо вращается вокруг синей планеты, надпись: КОСМОС');
    expect(scene.duration).toBe(30);
    expect(scene.title).toBe('КОСМОС');
    expect(scene.objects.some(object => object.id === 'orbit-1')).toBe(true);
  });

  it('rejects an empty or oversized brief', () => {
    expect(() => generateProceduralScene('short')).toThrow(/8 characters/);
    expect(() => generateProceduralScene('x'.repeat(2001))).toThrow(/2000 characters/);
  });
});
