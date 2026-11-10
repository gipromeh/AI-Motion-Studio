import { parseGeneratedSceneResponse, type GeneratedSceneSpec } from './generatedScene';

export type LmStudioModel = { id: string; object?: string };

function apiRoot(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) throw new Error('Enter the LM Studio server URL.');
  return trimmed.endsWith('/v1') ? trimmed : trimmed + '/v1';
}

async function readError(response: Response): Promise<string> {
  const body = await response.text().catch(() => '');
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
    return parsed.error?.message || parsed.message || body || response.statusText;
  } catch { return body || response.statusText; }
}

export async function discoverLmStudioModels(baseUrl: string): Promise<LmStudioModel[]> {
  const response = await fetch(apiRoot(baseUrl) + '/models', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('LM Studio connection failed (' + response.status + '): ' + await readError(response));
  const data = await response.json() as { data?: LmStudioModel[] };
  if (!Array.isArray(data.data) || data.data.length === 0) throw new Error('LM Studio is reachable, but no model is loaded. Load a model in LM Studio first.');
  return data.data.filter(model => typeof model.id === 'string' && model.id.length > 0);
}

const systemPrompt = [
  'You are AI Motion Studio Director. Convert the user brief into one complete, renderable 3D motion-design scene.',
  'Return ONLY valid JSON. No markdown, no code fences, no explanation.',
  'Schema:',
  '{',
  ' "title": string, "description": string, "duration": number (5..30), "background": "#RRGGBB",',
  ' "camera": {"from":[x,y,z],"to":[x,y,z],"start":number,"end":number},',
  ' "objects": [',
  '  {"id":string,"type":"sphere"|"box"|"torus"|"cylinder"|"text","text"?:string,',
  '   "position":[x,y,z],"rotation":[x,y,z],"scale":[x,y,z],"color":"#RRGGBB",',
  '   "emissive"?: "#RRGGBB","metalness"?:0..1,"roughness"?:0..1,"opacity"?:0..1,',
  '   "animations"?:[{"property":"position.x"|"position.y"|"position.z"|"rotation.x"|"rotation.y"|"rotation.z"|"scale.x"|"scale.y"|"scale.z"|"opacity",',
  '    "from":number,"to":number,"start":number,"end":number,"easing"?: "linear"|"easeInOut"|"easeOut"}]}',
  ' ]',
  '}',
  'Rules: 1-24 objects; duration 5-30 seconds; all vectors have exactly 3 numbers; positions within -15..15; scales 0.03..8; rotations in radians.',
  'Use several objects and staggered animations to create visual hierarchy. Build the whole scene from primitives; no external assets, scripts, HTML, URLs, or shaders.',
  'All animations are absolute-time tracks. For an object that enters, animate its position or scale from the initial value to the final value.',
  'For a text object, set type=text and provide a short text field. Use text for titles, labels, and end cards.',
  'The camera moves linearly from camera.from to camera.to between start and end, in world coordinates. Keep the main composition visible.',
  'Make the result visually coherent, cinematic, and directly related to the brief.'
].join('\n');

export async function generateSceneFromPrompt(options: {
  baseUrl: string;
  model: string;
  prompt: string;
  signal?: AbortSignal;
}): Promise<GeneratedSceneSpec> {
  const prompt = options.prompt.trim();
  if (prompt.length < 8) throw new Error('Describe the scene in at least 8 characters.');
  if (prompt.length > 2000) throw new Error('Scene brief must be 2000 characters or fewer.');
  if (!options.model.trim()) throw new Error('Select a loaded LM Studio model.');
  const response = await fetch(apiRoot(options.baseUrl) + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    signal: options.signal,
    body: JSON.stringify({
      model: options.model,
      temperature: 0.35,
      max_tokens: 5000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    })
  });
  if (!response.ok) throw new Error('Scene generation failed (' + response.status + '): ' + await readError(response));
  const data = await response.json() as { choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }> };
  const content = data.choices?.[0]?.message?.content;
  const text = typeof content === 'string'
    ? content
    : Array.isArray(content) ? content.map(part => part.text ?? '').join('') : '';
  if (!text.trim()) throw new Error('LM Studio returned an empty response. Check the loaded model and its context length.');
  return parseGeneratedSceneResponse(text);
}
