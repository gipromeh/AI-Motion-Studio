# Product roadmap

## Product north star

A user describes a film or motion-design task, reviews a director's treatment, and receives an editable project with a shot plan, scene graph, timeline, sound and export settings. AI must accelerate authoring without taking away deterministic control.

## M0 — Deterministic runtime (complete)
- [x] React + TypeScript + Vite application shell
- [x] Three.js renderer and absolute-time seek contract
- [x] Handcrafted demo compositions
- [x] Timeline transport and PNG frame export
- [x] Spring primitives and unit tests
- [x] H.264 MP4 export from deterministic frames
- [x] CI and GitHub Pages deployment workflows

## M1 — Studio workspace (in progress)
- [x] Replace demo-dashboard presentation with a production workspace layout
- [x] Dedicated composition navigator, preview, timeline and inspector
- [x] Director brief integrated into the authoring workflow
- [x] Local draft autosave and restore
- [x] Preserve offline and LM Studio generation paths
- [x] Preserve PNG/MP4 export and existing demo compositions
- [ ] Project creation, rename, duplicate and delete backed by a project registry
- [ ] Import/export a versioned project document
- [ ] Unified scene graph with selectable objects and editable transforms
- [ ] Multi-property keyframe tracks and easing controls

## M2 — Director and storyboard
- [ ] Provider-neutral director contract
- [ ] Treatment: creative brief, visual style, audience, duration and deliverables
- [ ] Storyboard with shot purpose, framing, camera move and duration
- [ ] Shot-level generation and regeneration without overwriting approved shots
- [ ] Art-direction pass and critique pass
- [ ] Human approval gates between treatment, storyboard and scene generation
- [ ] Asset manifest with local, generated and external assets

## M3 — Production timeline
- [ ] Multi-shot timeline with reorder, trim, split and transitions
- [ ] Audio tracks, cue placement, waveform and synchronized export
- [ ] Typography system: font family, weight, tracking, line height and text animation
- [ ] Material, lighting and camera inspector
- [ ] Contact sheet, storyboard and frame-strip export
- [ ] Undo/redo command history

## M4 — Render and delivery
- [ ] Render presets, quality controls and export queue
- [ ] Large-file streaming and memory-aware export
- [ ] Optional local FFmpeg render adapter
- [ ] Browser/device compatibility and performance tests
- [ ] Project packaging with asset dependency checks

## Non-goals

- Do not execute arbitrary code returned by an LLM.
- Do not require a cloud account or cloud render service for core authoring.
- Do not replace working handcrafted scenes with generated approximations.
- Do not claim multi-shot, audio-synchronized or full object-level editing before those capabilities exist.
