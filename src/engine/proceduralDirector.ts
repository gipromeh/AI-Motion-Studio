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
  const explicitPatterns = [
    /(?:title|заголовок|надпись|текст)\s*(?:reads|:|будет|—|-)\s*[«“"]?([^»”"\n]{2,40})[»”"]?/i,
    /(?:reads|надпись)\s*[«“"]([^»”"]{2,40})[»”"]/i,
    /(?:brand called|brand name|название бренда|бренд называется)\s*[:"«“]?\s*[«“"]?([^»”"’'\n.,]{2,40})/i
  ];
  const found = explicitPatterns.map(pattern => prompt.match(pattern)?.[1]?.trim()).find(Boolean);
  if (found) return found.replace(/[.!?]+$/, '').toUpperCase().slice(0, 32);
  const words = prompt.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim().split(/\s+/).filter(word => word.length > 3);
  return (words.slice(-2).join(' ') || 'NEW COMPOSITION').toUpperCase().slice(0, 32);
}

function inferTagline(prompt: string): string | undefined {
  const match = prompt.match(/(?:final tagline|tagline|слоган)\s*[:—-]?\s*[«“"]([^»”"]{2,48})[»”"]/i);
  return match?.[1]?.trim();
}

function animate(property: 'position.y' | 'rotation.y' | 'rotation.z' | 'scale.x' | 'scale.y' | 'scale.z' | 'opacity', from: number, to: number, start: number, end: number, easing: 'linear' | 'easeInOut' | 'easeOut' = 'easeInOut') {
  return { property, from, to, start, end, easing };
}

function makeText(id: string, text: string, position: [number, number, number], scale: [number, number, number], color: string, start: number, end: number): GeneratedObject {
  return {
    id, type: 'text', text, position, rotation: [0, 0, 0], scale, color,
    animations: [animate('opacity', 0, 1, start, end, 'easeOut'), animate('position.y', position[1] - 0.18, position[1], start, Math.min(end + 0.5, 30), 'easeOut')]
  };
}

function buildWhiskeyScene(prompt: string, duration: number, title: string): GeneratedObject[] {
  const motion = [
    animate('position.y', -0.12, 0.12, 0, duration, 'easeInOut'),
    animate('rotation.y', -0.12, 0.12, 0, duration, 'linear')
  ];
  const objects: GeneratedObject[] = [
    // Amber liquid visible through the bottle silhouette.
    { id: 'whiskey-liquid', type: 'cylinder', position: [0, -0.12, 0], rotation: [0, 0, 0], scale: [0.69, 0.98, 0.39], color: '#b96518', emissive: '#351606', metalness: 0.05, roughness: 0.16, animations: motion },
    // Broad bottle body, sloped shoulders, narrow neck and stopper form a recognizable silhouette.
    { id: 'bottle-body', type: 'cylinder', position: [0, -0.28, 0], rotation: [0, 0, 0], scale: [0.82, 1.18, 0.48], color: '#d59a42', emissive: '#241006', metalness: 0.08, roughness: 0.12, opacity: 0.48, animations: motion },
    { id: 'bottle-shoulders', type: 'sphere', position: [0, 0.78, 0], rotation: [0, 0, 0], scale: [0.79, 0.48, 0.47], color: '#dba64e', metalness: 0.08, roughness: 0.12, opacity: 0.5, animations: motion },
    { id: 'bottle-neck', type: 'cylinder', position: [0, 1.28, 0], rotation: [0, 0, 0], scale: [0.29, 0.48, 0.29], color: '#d9a04b', metalness: 0.08, roughness: 0.1, opacity: 0.55, animations: motion },
    { id: 'bottle-collar', type: 'torus', position: [0, 1.58, 0], rotation: [Math.PI / 2, 0, 0], scale: [0.3, 0.3, 0.3], color: '#d6a34f', metalness: 0.88, roughness: 0.2, animations: motion },
    { id: 'bottle-stopper', type: 'cylinder', position: [0, 1.83, 0], rotation: [0, 0, 0], scale: [0.25, 0.23, 0.25], color: '#2c1710', metalness: 0.42, roughness: 0.28, animations: motion },
    { id: 'bottle-label', type: 'text', text: title, position: [0, -0.22, 0.49], rotation: [0, 0, 0], scale: [0.72, 0.27, 1], color: '#3b2115', animations: [animate('opacity', 0, 1, 2.2, 3.2, 'easeOut')] },
  ];

  const countMatch = prompt.match(/\b(\d+)\s*(?:rings?|кольц\w*)/i);
  const ringCount = Math.max(2, Math.min(5, countMatch ? Number(countMatch[1]) : 3));
  for (let i = 0; i < ringCount; i++) {
    const angle = (Math.PI / ringCount) * i;
    objects.push({
      id: 'orbit-' + (i + 1), type: 'torus',
      position: [0, 0.08, -0.1 - i * 0.08],
      rotation: [0.48 + angle * 0.58, angle, angle * 0.28],
      scale: [1.42 + i * 0.22, 1.92 + i * 0.14, 0.72],
      color: '#d7a64f', emissive: '#603b12', metalness: 0.94, roughness: 0.16, opacity: 0.96,
      animations: [animate('rotation.y', angle, angle + Math.PI * 2 * (i % 2 ? -1 : 1), 0, duration, 'linear'), animate('rotation.z', angle * 0.28, angle * 0.28 + Math.PI * 0.38, 0, duration, 'linear')]
    });
  }

  objects.push(makeText('brand-title', title, [0, -2.55, 0.9], [0.86, 0.42, 1], '#e7bd75', duration * 0.48, duration * 0.62));
  const tagline = inferTagline(prompt);
  if (tagline) objects.push(makeText('brand-tagline', tagline, [0, -3.05, 0.9], [0.58, 0.19, 1], '#e6d9c4', duration * 0.64, duration * 0.74));
  return objects;
}

export function generateProceduralScene(promptText: string): GeneratedSceneSpec {
  const prompt = promptText.trim();
  if (prompt.length < 8) throw new Error('Describe the scene in at least 8 characters.');
  if (prompt.length > 2000) throw new Error('Scene brief must be 2000 characters or fewer.');

  const duration = inferDuration(prompt);
  const color = inferColor(prompt);
  const isWhiskey = /whisk(?:e)?y|виск\w*|самогонщик\w*/i.test(prompt);
  const isProduct = /lens|оптик|линз|product|продукт|предмет|товар|час|phone|телефон/i.test(prompt) || isWhiskey;
  const isOrbit = /orbit|ring|кольц|орбит|planet|планет|space|космос|спутник/i.test(prompt);
  const isTypography = /typograph|текст|типограф|букв|слово|title|заголов/i.test(prompt);
  // "lighting" is not a request for a light background; only explicit background language changes it.
  const lightBackground = /(?:light|white|светл\w*|бел\w*)\s+(?:background|фон)|фон\s+(?:светл\w*|бел\w*)/i.test(prompt);
  const background = lightBackground ? '#e9edf4' : '#080d18';
  const title = inferTitle(prompt);
  const objects: GeneratedObject[] = isWhiskey ? buildWhiskeyScene(prompt, duration, title) : [];

  if (!isWhiskey && isProduct) {
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
  } else if (!isWhiskey && !isProduct) {
    objects.push({
      id: 'core', type: isOrbit ? 'sphere' : 'box', position: [0, 0, 0], rotation: [0.2, 0.35, 0],
      scale: isOrbit ? [1.05, 1.05, 1.05] : [1.65, 1.15, 0.55], color,
      emissive: color, metalness: 0.48, roughness: 0.26,
      animations: [animate('scale.x', 0.65, isOrbit ? 1.05 : 1.65, 0, 1.8, 'easeOut'), animate('rotation.y', 0, Math.PI * 2, 0, duration, 'linear')]
    });
  }

  if (!isWhiskey && (isOrbit || isProduct)) {
    const countMatch = prompt.match(/\b(\d+)\s*(?:rings?|кольц\w*)/i);
    const count = Math.max(2, Math.min(5, countMatch ? Number(countMatch[1]) : 3));
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

  if (!isWhiskey && !isProduct && !isOrbit) {
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

  if (!isWhiskey && (isTypography || title.length > 0)) {
    objects.push({
      id: 'title-card', type: 'text', text: title,
      position: [0, -2.35, 0.8], rotation: [0, 0, 0], scale: [1.05, 1.05, 1],
      color: background === '#e9edf4' ? '#101827' : '#f3f4f7',
      animations: [animate('opacity', 0, 1, Math.max(0, duration * 0.48), Math.min(duration, duration * 0.62), 'easeOut'), animate('position.y', -2.65, -2.2, Math.max(0, duration * 0.48), Math.min(duration, duration * 0.68), 'easeOut')]
    });
  }

  const cameraEnd = /push.?in|zoom|приближ|наезд|крупн/i.test(prompt) ? [0, 0, 7.6] as [number, number, number] : [0, 0, 8.8] as [number, number, number];
  const result = {
    title,
    description: 'Procedural composition · ' + (isWhiskey ? 'whiskey product film' : isProduct ? 'product film' : isOrbit ? 'orbital motion' : 'kinetic 3D design'),
    duration,
    background,
    camera: { from: [0, 0, 9] as [number, number, number], to: cameraEnd, start: 0, end: duration },
    objects
  };
  return validateGeneratedScene(result);
}
