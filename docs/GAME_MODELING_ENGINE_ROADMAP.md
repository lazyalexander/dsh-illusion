# Game modeling engine roadmap

English | [简体中文](GAME_MODELING_ENGINE_ROADMAP.zh-CN.md)

Illusion is currently a reviewable modular construction engine, not yet a complete game-asset production engine. The roadmap advances by accepted artifacts and engine evidence rather than visual ambition alone.

## Stage 1 — Asset taxonomy and repeatable benchmark

Status: implemented in this release.

- Add a `game-asset` profile covering humanoids, creatures, buildings, vehicles, props, vegetation, terrain, and environments.
- Record archetype, usage, style, target engine, and unit.
- Add silhouette, structure, details, collision, and LOD phases.
- Ship a reusable Skill, a role/handoff Agentment contract, and a cross-category benchmark catalog.

Acceptance: all profile variants parse; every catalog category is covered; DeepSeek can publish a visible smoke asset for each category; history, review, branching, and export controls remain available.

### Governance foundation — implemented

- Keep one installable coordinator while separating modeling, validation, and export as governed capability plugins.
- Reject missing dependencies, cycles, conflicts, duplicate capability providers, and duplicate mutation owners before runtime use.
- Bind Agentment roles to plugin IDs without claiming separate runtime agents or npm packages.

Acceptance: the built-in graph resolves deterministically; DeepSeek Modeler alone owns model mutation; export owns only downloadable artifacts; governance failure cases pass automated tests.

## Stage 2 — Game semantics

Status: protocol and deterministic reference validation implemented; target-engine import probes remain pending.

- Add explicit asset bounds, pivot/origin, sockets, material slots, modular grid, collision primitives, and LOD groups. **Implemented.**
- Display semantic counts in the card and carry the complete declaration into build JSON and GLB metadata. **Implemented.**
- Validate hierarchy references, collider ownership, unique slot membership, decreasing LOD thresholds, and LOD membership atomically. **Implemented.** Scale/grounding and modular-seam geometry checks remain pending.

Acceptance: fixtures round-trip every field; invalid references fail atomically; Godot, Unity, and Unreal import probes recover the same IDs, transforms, slots, and groups.

## Stage 3 — Mesh and material production

- Add controlled mesh editing, normals, UV sets, material-slot assignment, texture references, and triangle budgets.
- Preserve editable source and derived runtime meshes separately.
- Introduce deterministic topology and UV validation where observable.

Acceptance: representative prop, building module, creature, and vehicle assets meet declared triangle, UV, normal, and material-slot gates in an external DCC inspection.

## Stage 4 — Deformation and animation

- Add skin weights, bind poses, constraints, IK metadata, expressions, animation clips, and motion tests.
- Separate rest-rig evidence from deformation and runtime animation evidence.

Acceptance: humanoid and quadruped fixtures complete motion suites without unacceptable clipping or joint collapse, and export/import retains skeleton and clips.

## Stage 5 — Engine adapters

- Provide versioned Godot, Unity, and Unreal adapters with import presets and receipts.
- Verify colliders, materials, LODs, sockets, animation, scale, and runtime instancing inside each target engine.

Acceptance: a clean project imports and instantiates every benchmark asset through a reproducible command or documented editor action; observed runtime behavior is recorded separately from export success.

## Stage 6 — Asset library and world composition

- Add immutable asset versions, dependency graphs, kit composition, variants, scene placement, and update reconciliation.
- Keep accepted checkpoints and engine-import receipts traceable to source builds.

Acceptance: a small playable scene is assembled from versioned benchmark assets, survives an asset revision, and reports which instances updated, remained pinned, or need manual resolution.
