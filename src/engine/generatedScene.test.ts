import { describe, expect, it } from 'vitest';
import { parseGeneratedSceneResponse, validateGeneratedScene } from './generatedScene';

const validScene = {
  title: 'OPTICS 2030',
  description: 'A glass lens with orbital rings.',
  duration: 15,
  background: '#07101d',
  camera: { from: [0, 0, 9], to: [0, 0, 7], start: 0, end: 15 },
  objects: [
    {
      id: 'lens',
      type: 'sphere',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 0.35],
      color: '#8bbbe8',
      metalness: 0.2,
      roughness: 0.12,
      animations: [
        { property: 'rotation.y', from: 0, to: 6.28, start: 0, end: 15, easing: 'linear' }
      ]
    },
    {
      id: 'title',
      type: 'text',
      text: 'OPTICS 2030',
      position: [0, -2.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#ffffff',
      animations: [
        { property: 'opacity', from: 0, to: 1, start: 10, end: 12, easing: 'easeOut' }
      ]
    }
  ]
};

describe('generated scene schema', () => {
  it('accepts a valid scene with animated objects', () => {
    const scene = validateGeneratedScene(validScene);
    expect(scene.objects).toHaveLength(2);
    expect(scene.title).toBe('OPTICS 2030');
  });

  it('rejects unsafe or unsupported geometry', () => {
    expect(() => validateGeneratedScene({
      ...validScene,
      objects: [{ ...validScene.objects[0], type: 'script' }]
    })).toThrow(/Unsupported object type/);
  });

  it('rejects excessive object counts', () => {
    expect(() => validateGeneratedScene({
      ...validScene,
      objects: Array.from({ length: 25 }, (_, index) => ({ ...validScene.objects[0], id: 'obj-' + index }))
    })).toThrow(/between 1 and 24/);
  });

  it('parses JSON wrapped in a model code fence', () => {
    const fence = String.fromCharCode(96).repeat(3);
    const parsed = parseGeneratedSceneResponse(fence + 'json' + String.fromCharCode(10) + JSON.stringify(validScene) + String.fromCharCode(10) + fence);
    expect(parsed.title).toBe('OPTICS 2030');
  });
});
