export type GeneratedPrimitive = 'sphere' | 'box' | 'torus' | 'cylinder' | 'text';
export type AnimatedProperty =
  | 'position.x' | 'position.y' | 'position.z'
  | 'rotation.x' | 'rotation.y' | 'rotation.z'
  | 'scale.x' | 'scale.y' | 'scale.z' | 'opacity';
export type SceneAnimation = {
  property: AnimatedProperty;
  from: number;
  to: number;
  start: number;
  end: number;
  easing?: 'linear' | 'easeInOut' | 'easeOut';
};
export type GeneratedObject = {
  id: string;
  type: GeneratedPrimitive;
  text?: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  emissive?: string;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  animations?: SceneAnimation[];
};
export type GeneratedSceneSpec = {
  title: string;
  description: string;
  duration: number;
  background: string;
  camera: { from: [number, number, number]; to: [number, number, number]; start: number; end: number };
  objects: GeneratedObject[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isVector = (value: unknown): value is [number, number, number] =>
  Array.isArray(value) && value.length === 3 && value.every(item => typeof item === 'number' && Number.isFinite(item));
const isHex = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
const finiteIn = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const properties: AnimatedProperty[] = [
  'position.x', 'position.y', 'position.z', 'rotation.x', 'rotation.y', 'rotation.z',
  'scale.x', 'scale.y', 'scale.z', 'opacity'
];

export function validateGeneratedScene(value: unknown): GeneratedSceneSpec {
  if (!isRecord(value)) throw new Error('AI response must be a JSON object.');
  if (typeof value.title !== 'string' || !value.title.trim() || value.title.length > 80) throw new Error('Scene title is missing or too long.');
  if (typeof value.description !== 'string' || value.description.length > 240) throw new Error('Scene description is invalid.');
  if (!finiteIn(value.duration, 5, 30)) throw new Error('Scene duration must be between 5 and 30 seconds.');
  const duration = value.duration;
  if (!isHex(value.background)) throw new Error('Scene background must be a six-digit hex color.');
  if (!isRecord(value.camera) || !isVector(value.camera.from) || !isVector(value.camera.to) ||
      !finiteIn(value.camera.start, 0, duration) || !finiteIn(value.camera.end, 0, duration) ||
      value.camera.end <= value.camera.start) throw new Error('Camera animation is invalid.');
  if (!Array.isArray(value.objects) || value.objects.length < 1 || value.objects.length > 24) {
    throw new Error('Scene must contain between 1 and 24 objects.');
  }
  const ids = new Set<string>();
  const objects: GeneratedObject[] = value.objects.map((raw, index) => {
    if (!isRecord(raw)) throw new Error('Object ' + index + ' is invalid.');
    if (typeof raw.id !== 'string' || !/^[a-zA-Z0-9_-]{1,32}$/.test(raw.id) || ids.has(raw.id)) throw new Error('Object IDs must be unique and use letters, numbers, _ or -.');
    ids.add(raw.id);
    if (!['sphere', 'box', 'torus', 'cylinder', 'text'].includes(String(raw.type))) throw new Error('Unsupported object type: ' + String(raw.type));
    if (!isVector(raw.position) || raw.position.some(n => Math.abs(n) > 15)) throw new Error('Object position is outside the supported scene bounds.');
    if (!isVector(raw.rotation) || raw.rotation.some(n => Math.abs(n) > 25)) throw new Error('Object rotation is invalid.');
    if (!isVector(raw.scale) || raw.scale.some(n => n < 0.03 || n > 8)) throw new Error('Object scale must be between 0.03 and 8.');
    if (!isHex(raw.color)) throw new Error('Object color must be a six-digit hex color.');
    if (raw.emissive !== undefined && !isHex(raw.emissive)) throw new Error('Object emissive color is invalid.');
    if (raw.type === 'text' && (typeof raw.text !== 'string' || !raw.text.trim() || raw.text.length > 48)) throw new Error('Text objects need a short text value.');
    if (raw.metalness !== undefined && !finiteIn(raw.metalness, 0, 1)) throw new Error('Metalness must be between 0 and 1.');
    if (raw.roughness !== undefined && !finiteIn(raw.roughness, 0, 1)) throw new Error('Roughness must be between 0 and 1.');
    if (raw.opacity !== undefined && !finiteIn(raw.opacity, 0, 1)) throw new Error('Opacity must be between 0 and 1.');
    if (raw.animations !== undefined && (!Array.isArray(raw.animations) || raw.animations.length > 8)) throw new Error('Each object can have at most 8 animations.');
    const animations = (raw.animations ?? []) as unknown[];
    for (const animation of animations) {
      if (!isRecord(animation) || !properties.includes(animation.property as AnimatedProperty) ||
          !finiteIn(animation.from, -20, 20) || !finiteIn(animation.to, -20, 20) ||
          !finiteIn(animation.start, 0, duration) || !finiteIn(animation.end, 0, duration) ||
          animation.end <= animation.start ||
          (animation.easing !== undefined && !['linear', 'easeInOut', 'easeOut'].includes(String(animation.easing)))) {
        throw new Error('An object animation is invalid.');
      }
    }
    return {
      id: raw.id,
      type: raw.type as GeneratedPrimitive,
      text: typeof raw.text === 'string' ? raw.text : undefined,
      position: raw.position,
      rotation: raw.rotation,
      scale: raw.scale,
      color: raw.color,
      emissive: raw.emissive as string | undefined,
      metalness: raw.metalness as number | undefined,
      roughness: raw.roughness as number | undefined,
      opacity: raw.opacity as number | undefined,
      animations: animations as SceneAnimation[]
    };
  });
  return {
    title: value.title.trim(),
    description: value.description.trim(),
    duration,
    background: value.background,
    camera: {
      from: value.camera.from,
      to: value.camera.to,
      start: value.camera.start,
      end: value.camera.end
    },
    objects
  };
}

export function parseGeneratedSceneResponse(content: string): GeneratedSceneSpec {
  const cleaned = content.trim().replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('LM Studio returned invalid JSON. Ask the model for a JSON-only response.');
    try { parsed = JSON.parse(cleaned.slice(start, end + 1)); }
    catch { throw new Error('LM Studio returned malformed scene JSON.'); }
  }
  return validateGeneratedScene(parsed);
}
