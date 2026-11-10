# Architecture

## Product boundary
The browser application owns authoring, preview, deterministic scene playback, and frame export. Rendering backends and model providers remain adapters.

## Scene contract
A scene is a deterministic function of absolute time. seek(t) derives every animated property from the requested time, independent of previous frames. Random-looking layouts use seeded PRNGs.

## Layers
- UI: React project browser, preview, typography properties, timeline and transport.
- Motion engine: Three.js renderer, spring functions, keyframe model and interpolation.
- AI orchestration: provider-neutral director, storyboard, style guide and critic (planned).
- Export: PNG now; WebCodecs/server FFmpeg adapter planned.

## Keyframe model
A keyframe has a stable ID, time in seconds and numeric value. Tracks are sorted at evaluation time; interpolation is linear with endpoint hold. Editing a keyframe at an occupied timestamp replaces the previous key at that timestamp.

## Constraints
- No API keys in the browser bundle.
- LM Studio must be reached through an explicit local bridge/proxy; browser CORS and mixed-content restrictions must be handled deliberately.
- GitHub Pages is static hosting, not a server runtime.
