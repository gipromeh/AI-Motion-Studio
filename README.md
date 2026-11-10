# AI Motion Studio

**Local-first motion-design workbench.** Describe a composition, direct its visual treatment, edit the result on a timeline, and render deterministic frames to video.

## Product model

AI Motion Studio separates three responsibilities:

- **Director** — interprets a brief and proposes a visual composition.
- **Editor** — gives the user control over the project, preview, timeline and editable parameters.
- **Engine** — evaluates animation at absolute timestamps and renders repeatable frames.

The application is not a prompt-to-video black box. The intended output is an editable motion-design project.

## Current capabilities

- React + TypeScript + Vite workspace.
- Three.js WebGL renderer and deterministic seek(t).
- Five handcrafted compositions: FUTURE, OPTIC, ORBIT, NEON GENESIS and TITANIC.
- Offline procedural scene generation.
- LM Studio integration through its OpenAI-compatible /v1 API.
- Validated declarative scene schema; generated code is never executed.
- Local draft autosave and restore in the current browser.
- PNG current-frame export.
- H.264 MP4 export through Mediabunny and WebCodecs, 1920×1080 at 30 FPS.

The new workspace UI provides composition navigation, a director brief, render preview, master timeline and inspector. The current inspector has editable typography/keyframe controls for FUTURE; other handcrafted scene rigs and generated-object listings are not yet fully editable.

## Development

```bash
npm ci
npm run dev
npm run test
npm run build
```

## LM Studio

1. Load an instruct model in LM Studio.
2. Start Local Server and enable CORS.
3. Open AI Motion Studio on the same computer.
4. Select **LM Studio**, set the server URL (default http://localhost:1234/v1), connect and generate.

A browser on an iPhone cannot use localhost:1234 to reach LM Studio on a separate PC. For phone-to-PC use, configure a reachable LAN endpoint, Vite host access, LM Studio CORS and the PC firewall. Do not expose an unauthenticated model server to the public internet.

## Export

MP4 export renders frames offline from absolute timestamps; it does not record real-time playback. It requires a recent Chromium-based browser with WebCodecs H.264 support and a secure context (HTTPS or localhost). The current export contains video only; synchronized audio export is planned.

## GitHub Pages

The Deploy to GitHub Pages workflow publishes dist when a commit reaches main. Enable Settings → Pages → Build and deployment → GitHub Actions.

https://gipromeh.github.io/AI-Motion-Studio/

GitHub Pages is static hosting. It cannot act as a proxy for a local LM Studio server.

## Titanic assets

The TITANIC composition loads GLTF assets from KantLex / 3D-Titanic-Model, pinned to revision 661b58512d0bacd36ba2c5cd9dd060f0f105cb0d. The upstream project is MIT licensed; its license and copyright terms apply. Models are loaded from jsDelivr at runtime, so TITANIC requires an internet connection. The sequence is a cinematic reconstruction, not a fluid or structural engineering simulation.
