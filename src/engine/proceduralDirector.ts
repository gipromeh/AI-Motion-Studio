import { validateGeneratedScene, type GeneratedObject, type GeneratedSceneSpec } from './generatedScene';

const colorMap: Array<[RegExp, string]> = [
  [/\b(red|красн\w*)\b/i, '#f05b58'],
  [/\b(blue|син\w*|голуб\w*)\b/i, '#4b83e8'],
  [/\b(green|зелён\w*|зелен\w*)\b/i, '#55c98b'],
  [/\b(gold|золот\w*|золотист\w*)\b/i, '#d8a64b'],
  [/\b(purple|фиолетов\w*|пурпур\w*)\b/i, '#9b72df'],
  [/\b(cyan|бирюзов\w*|циан\w*)\b/i, '#35c8d8'],
  [/\b(white|бел\w*)\b/i, '#e9edf4'],
  [/\b(orange|оранжев\w*)\b/i, '#ed8958']
];

function inferColor(prompt: string): string {
  return colorMap.find(([pattern]) => pattern.test(prompt))?.[1] ?? '#75a9d8';
}
function inferDuration(prompt: string): number {
  const match = prompt.match(/(\d+(?:[.,]\d+)?)\s*(?:-\s*)?(?:second|seconds|sec|s|секунд\w*|сек\.?)/i);
  return Math.max(5, Math.min(30, match ? Number(match[1].replace(',', '.')) : 15));
}
function inferTitle(prompt: string): string {
  const patterns = [
    /(?:title|заголовок|надпись|текст)\s*(?:reads|:|будет|—|-)\s*["«]?([^"».,\n]{2,40})["»]?/i,
    /(?:reads|надпись)\s*["«]([^"»]{2,40})["»]/i
  ];
  const found = patterns.map(pattern => prompt.match(pattern)?.[1]?.trim()).find(Boolean);
  if (found) return found.toUpperCase();
  const words = prompt.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim().split(/\s+/).filter(word => word.length > 3);
  return (words.slice(-2).join(' ') || 'NEW COMPOSITION').toUpperCase().slice(0, 32);
}
function animate(property: 'position.y' | 'rotation.y' | 'rotation.z' | 'scale.x' | 'scale.y' | 'scale.z' | 'opacity', from: number, to: number, start: number, end: number, easing: 'linear' | 'easeInOut' | 'easeOut' = 'easeInOut') {
  return { property, from, to, start, end, easing };
}

export function generateProceduralScene(promptText: string): GeneratedSceneSpec {
  const prompt = promptText.trim();
  if (prompt.length < 8) throw new Error('Describe the scene in at least 8 characters.');
  if (prompt.length > 2000) throw new Error('Scene brief must be 2000 characters or fewer.');

  const duration = inferDuration(prompt);
  const color = inferColor(prompt);
  const isProduct = /lens|оптик|линз|product|продукт|предмет|товар|час|phone|телефон/i.test(prompt);
  const isOrbit = /orbit|ring|кольц|орбит|planet|планет|space|космос|спутник/i.test(prompt);
  const isTypography = /typograph|текст|типограф|букв|слово|title|заголов/i.test(prompt);
  const background = /light|светл\w* фон|белый фон/i.test(prompt) ? '#e9edf4' : '#080d18';
  const title = inferTitle(prompt);
  const objects: GeneratedObject[] = [];

  if (isProduct) {
    objects.push({
      id: 'hero-object', type: 'sphere', position: [0, 0, 0], rotation: [0, 0, 0],
      scale: [1.35, 1.35, 0.42], color, emissive: '#10263d', metalness: 0.28, roughness: 0.12,
      animations: [animate('position.y', -0.35, 0.18, 0, duration, 'easeInOut'), animate('rotation.y', 0, Math.PI * 2, 0, duration, 'linear')]
    });
    objects.push({
      id: 'lens-highlight', type: 'torus', position: [0, 0, 0.38], rotation: [0.25, 0.1, 0],
      scale: [1.22, 1.22, 0.32], color: '#d8eaff', emissive: '#315b88', metalness: 0.8, roughness: 0.12, opacity: 0.78,
      animations: [animate('rotation.z', 0, Math.PI * 2, 0, duration, 'linear')]
    });
  } else {
    objects.push({
      id: 'core', type: isOrbit ? 'sphere' : 'box', position: [0, 0, 0], rotation: [0.2, 0.35, 0],
      scale: isOrbit ? [1.05, 1.05, 1.05] : [1.65, 1.15, 0.55], color,
      emissive: color, metalness: 0.48, roughness: 0.26,
      animations: [animate('scale.x', 0.65, isOrbit ? 1.05 : 1.65, 0, 1.8, 'easeOut'), animate('rotation.y', 0, Math.PI * 2, 0, duration, 'linear')]
    });
  }

  if (isOrbit || isProduct) {
    const count = Math.max(2, Math.min(5, (prompt.match(/\b(\d+)\s*(?:rings?|кольц\w*)/i)?.[1] ? Number(prompt.match(/\b(\d+)\s*(?:rings?|кольц\w*)/i)?.[1]) : 3)));
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI / count) * i;
      objects.push({
        id: 'orbit-' + (i + 1), type: 'torus',
        position: [0, 0, -0.15 - i * 0.08],
        rotation: [0.55 + angle * 0.55, angle, angle * 0.35],
        scale: [1.55 + i * 0.34, 1.12 + i * 0.24, 0.72],
        color: i % 2 ? '#b9c8dd' : '#e7a46c',
        emissive: i % 2 ? '#263c60' : '#65351f',
        metalness: 0.82, roughness: 0.2, opacity: 0.88,
        animations: [animate('rotation.y', angle, angle + Math.PI * 2 * (i % 2 ? -1 : 1), 0, duration, 'linear'), animate('rotation.z', angle * 0.3, angle * 0.3 + Math.PI * 0.5, 0, duration, 'linear')]
      });
    }
  }

  if (!isProduct && !isOrbit) {
    for (let i = 0; i < 4; i++) {
      objects.push({
        id: 'accent-' + (i + 1), type: i % 2 ? 'sphere' : 'box',
        position: [(i - 1.5) * 1.35, i % 2 ? 1.65 : -1.55, -0.8],
        rotation: [0.2 * i, 0.35 * i, 0.15 * i],
        scale: [0.16 + (i % 2) * 0.08, 0.16 + (i % 2) * 0.08, 0.16],
        color: i % 2 ? '#d8eaff' : color, emissive: color, metalness: 0.35, roughness: 0.3,
        animations: [animate('position.y', (i % 2 ? 1.65 : -1.55) - 0.35, (i % 2 ? 1.65 : -1.55) + 0.35, 0, duration, 'easeInOut'), animate('rotation.z', 0, Math.PI * 2, 0, duration, 'linear')]
      });
    }
  }

  if (isTypography || title.length > 0) {
    objects.push({
      id: 'title-card', type: 'text', text: title,
      position: [0, -2.35, 0.8], rotation: [0, 0, 0], scale: [1.05, 1.05, 1],
      color: background === '#e9edf4' ? '#101827' : '#f3f4f7',
      animations: [animate('opacity', 0, 1, Math.max(0, duration * 0.48), Math.min(duration, duration * 0.62), 'easeOut'), animate('position.y', -2.65, -2.2, Math.max(0, duration * 0.48), Math.min(duration, duration * 0.68), 'easeOut')]
    });
  }

  const cameraEnd = /push.?in|zoom|приближ|наезд|крупн/i.test(prompt) ? [0, 0, 6.8] as [number, number, number] : [0, 0, 8.8] as [number, number, number];
  const result = {
    title,
    description: 'Procedural composition · ' + (isProduct ? 'product film' : isOrbit ? 'orbital motion' : 'kinetic 3D design'),
    duration,
    background,
    camera: { from: [0, 0, 9] as [number, number, number], to: cameraEnd, start: 0, end: duration },
    objects
  };
  return validateGeneratedScene(result);
}
