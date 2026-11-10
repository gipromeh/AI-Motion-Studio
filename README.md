# AI Motion Studio

Browser-first motion-design system. This repository starts with a deterministic browser renderer and three demo compositions: kinetic typography, product motion, and scientific visualization.

## Stack
- React + TypeScript + Vite
- Three.js / WebGL
- GSAP timeline orchestration
- Web Audio API
- Vitest

## Principles
- Every scene is seekable: `seek(t)` renders the same frame for the same time.
- No implicit render state, timers, or unseeded randomness.
- Browser-first development; render and AI providers are adapters.
- LM Studio integration is planned after the core editor contract stabilizes.

## Development
```bash
npm ci
npm run dev
npm run test
npm run build
```

## GitHub Pages

The `Deploy to GitHub Pages` workflow builds the Vite app and publishes `dist` whenever a commit reaches `main`. The Vite build uses relative asset paths so the app works from the repository subpath.

After enabling GitHub Pages with **Build and deployment → Source → GitHub Actions** in repository settings, the application is available at:

https://gipromeh.github.io/AI-Motion-Studio/

The workflow can also be started manually from the Actions tab.

## MP4 export

The editor exports the active deterministic scene to H.264 MP4 at 1920×1080 and 30 FPS using Mediabunny and the browser WebCodecs encoder. Export renders frames offline from their absolute timeline timestamps; it does not record real-time playback.

Requirements:
- A recent Chromium-based browser with WebCodecs H.264 encoding support.
- A secure context (HTTPS or localhost).
- This first implementation exports video only; synchronized audio is a follow-up milestone.
- The first implementation buffers the completed MP4 in memory. Keep test exports short on memory-constrained devices.
