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
npm install
npm run dev
npm run test
npm run build
```
