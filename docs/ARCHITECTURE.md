# Architecture

## Product direction

AI Motion Studio is a local-first motion-design workbench. It is not a prompt-to-video wrapper. The user owns an editable composition; AI assists with art direction and scene construction; the motion engine evaluates the composition deterministically; the renderer produces preview and final frames.

## Runtime layers

- **Workspace UI** — project selection, director brief, preview, timeline transport, inspector and export controls.
- **Project state** — serializable local draft containing the active composition, generation brief, provider settings, title controls, keyframes and generated scene specification. The browser autosaves this draft to local storage and restores it on launch.
- **Director adapters** — offline procedural director and LM Studio OpenAI-compatible adapter. Both produce the same validated GeneratedSceneSpec contract.
- **Scene runtime** — Three.js scene construction and absolute-time evaluation. Existing handcrafted scenes and generated scenes remain separate scene implementations.
- **Export** — deterministic frame rendering through WebCodecs/Mediabunny to H.264 MP4; PNG export captures the current preview frame.

## Determinism contract

A scene is a function of absolute time. seek(t) derives every animated property from the requested timestamp, independent of prior frames. Random-looking layouts use seeded PRNGs. Export must call the same seek path used by preview; real-time playback is not recorded.

## Project and scene boundaries

A project is the authoring document and persistence boundary. A scene is a renderable composition. A shot is a time-bounded editorial unit within a project and is a future extension; current generated projects still contain one scene and one master clip. The UI must not imply multi-shot editing until the timeline and renderer support it.

## AI safety and validation

- Model output is parsed as data and validated against a bounded schema.
- Generated code is never evaluated.
- No API keys or credentials are embedded in the browser bundle.
- LM Studio is an explicitly configured local provider. Browser CORS and network access must be configured by the user.
- Static GitHub Pages hosting is not a server runtime and cannot proxy a local model server.

## Current editing boundary

The new workspace preserves the existing scene gallery, offline and LM Studio generation, deterministic preview, MP4/PNG export, and the title-scale keyframe editor. The inspector exposes composition metadata and the editable title track; generated object listing is currently read-only. A unified editable scene graph, multi-shot storyboard, audio timeline, project import/export and richer material/camera controls remain roadmap items.

## Performance and resource lifecycle

Three.js geometries, materials and textures must be disposed when a scene is replaced. External Titanic GLTF assets are asynchronous and guarded by a scene epoch so stale loads cannot attach to a newly selected scene. The Titanic asset sequence currently loads models from a pinned jsDelivr source and therefore requires internet access.
