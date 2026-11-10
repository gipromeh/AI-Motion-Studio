# Architecture

## Product boundary
The browser application owns authoring, preview, deterministic scene playback, and frame export. Rendering backends and model providers are adapters and must not leak into scene definitions.

## Scene contract
A scene is a deterministic function of absolute time. `seek(t)` must fully derive every animated property from `t`; it must not depend on previously rendered frames. Random-looking layouts must use seeded PRNGs.

## Layers
- UI: React project browser, preview, timeline, transport, export.
- Motion engine: scene registry, spring/keyframe math, WebGL renderer, audio cues.
- AI orchestration (next milestone): provider interface, director, storyboard, style guide, critic.
- Export (later): browser frame capture, WebCodecs where supported, server/FFmpeg adapter.

## Constraints
- No API keys in the browser bundle.
- LM Studio is reached through an explicit local bridge/proxy; browser CORS and mixed-content restrictions must be handled deliberately.
- GitHub Pages is static hosting, not a server runtime.
