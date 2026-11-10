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


## Prompt-to-scene generation (MVP)

The editor can ask a local LM Studio model to generate a structured 3D composition from a natural-language brief.

1. Install and open LM Studio, download a capable instruct model, and load it.
2. Start the Local Server on port 1234. Enable CORS in the server settings.
3. Run this app on the same computer with `npm install` and `npm run dev`, then open the local Vite URL.
4. In **AI Director**, connect to `http://localhost:1234/v1` (the model ID is discovered from the server) and click **Generate scene**.

The model returns a validated JSON scene description, not executable code. The renderer currently supports spheres, boxes, toruses, cylinders, text planes, per-object transforms/materials, absolute-time property animation, and a linear camera move. Generated scenes remain deterministic and can be scrubbed or exported with the existing MP4 pipeline.

The GitHub Pages build is useful for previewing the editor, but a browser on an iPhone cannot use `localhost:1234` to reach LM Studio running on a separate PC. For phone-to-PC generation, the LM Studio endpoint needs a reachable HTTPS address and suitable CORS/network configuration. Do not expose an unauthenticated model server directly to the public internet.


## Offline Procedural Director

The editor defaults to **Procedural Director**, which creates a validated scene locally in the browser. It does not call an LLM, require LM Studio, or make a network request. It recognizes common English and Russian descriptions for product objects, orbital compositions, colors, duration, camera push-in, and title text, then builds the same `GeneratedSceneSpec` consumed by the Three.js renderer. Generated scenes remain seekable and use the existing MP4 export pipeline.

Switch to **AI Director** to use the LM Studio prompt-to-scene provider. Both modes share the same scene renderer and export path. Procedural generation is deterministic and rule-based; it is not an open-ended language model and only interprets the supported prompt vocabulary.

### Specialized whiskey product composition

The offline procedural director recognizes whiskey / виски / «Самогонщики» briefs and creates a dedicated product layout instead of falling back to a generic sphere: bottle body, shoulders, neck, stopper, amber liquid, front label, gold orbital rings, brand title and optional tagline. Explicit title text takes precedence over the Latin transliteration in the brand name. The procedural bottle is a stylized primitive-based 3D model; it is not photorealistic glass or a physically simulated liquid.


## Titanic cinematic asset scene

The TITANIC sequence uses a high-detail GLTF asset set instead of the original primitive ship approximation. The browser loads the hull, deck structure, funnels, lifeboats, masts, bridge fittings, propellers, rudder and iceberg from a pinned upstream revision. Draco-compressed meshes are decoded in the browser. The scene adds a deforming physical ocean surface, clipped bow/stern asset groups, deterministic collision/separation/sinking motion, and absolute-time camera shots.

Asset source: [KantLex / 3D-Titanic-Model](https://github.com/KantLex/3D-Titanic-Model), pinned to `661b58512d0bacd36ba2c5cd9dd060f0f105cb0d`. The source project is MIT licensed; its copyright and license terms remain applicable. The model files are loaded from jsDelivr at runtime, so the TITANIC scene requires an internet connection. Other scenes remain fully local.

This is a cinematic real-time reconstruction, not a fluid/structural engineering simulation. The ship split is a deterministic mesh-clipping animation; it does not calculate physical hull fracture.


### Titanic impact VFX

The collision beat adds deterministic GPU point effects for ice/hull fragments, water spray and rising smoke, plus a short additive impact flash and point-light pulse. The camera receives a damped impact shake. The title layers clear before contact so they do not obscure the collision. The shot sequence moves from a wide establishing view to the iceberg approach, close impact, reverse angle and wide sinking view. Every effect is evaluated from absolute timeline time; seeking and frame-by-frame MP4 export reproduce the same positions without simulation state.
