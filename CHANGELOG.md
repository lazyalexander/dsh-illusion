# Release notes

English | [简体中文](CHANGELOG.zh-CN.md)

## 0.5.0 — Reviewable 2D and 3D creation

Released: 2026-11-15

### Highlights

- Keeps every published 2D or 3D checkpoint visible and replayable in the DSH conversation.
- Asks for author approval between steps and accepts text or text-plus-file adjustments.
- Supports branching and exporting from a selected historical checkpoint.
- Adds semantic 2D composition review, frame-level zoom, and a browser-local pixel editor whose saved result can become the next iteration reference.
- Adds a visible bilingual drawing-mode switch in the conversation composer.
- Governs modeling, validation, export, game semantics, and 2D-art capabilities inside one installable plugin.
- Adds bilingual privacy documentation, third-party notices, and a scanner for common credentials, personal paths, sensitive local files, PNG metadata, and reachable Git history.

### Known boundaries

- DeepSeek or the configured image/model provider owns actual creative generation; Illusion owns the reviewable workflow, structured scene/art state, validation, history, branching, and export surfaces.
- A structural GLB export is not proof of successful import or visual acceptance in a target game engine.
- Automatic live branch restoration currently requires the source plugin process to remain available.
- The included pixel demonstration proves a deterministic DSH-authored layout, not a production raster-provider pipeline.
