---
name: illusion-game-assets
description: Build, revise, validate, branch, and export categorized modular game assets with DeepSeek Harness and dsh-illusion. Use for humanoids, creatures, buildings, vehicles, props, vegetation, terrain, and environment assemblies; not for claiming production topology, UVs, skinning, or engine import that Illusion has not verified.
---

# Illusion Game Assets

Use DeepSeek as the modeling decision-maker and `illusion_build` as the visible, replayable construction record.

## Route the request

1. Identify the asset category, archetype, style, intended usage, engine target, unit, and acceptance target. Infer ordinary choices when the brief is clear; ask only when a missing choice would materially change the asset.
2. Start with `profile.kind="game-asset"`. Choose one category from the maintained matrix in [references/category-matrix.md](references/category-matrix.md).
3. Choose interactive execution for uncertain art direction or Plan execution for a well-bounded target. In Plan mode, publish every semantic node with a separate `illusion_build` call.
4. Keep stable semantic IDs. Revise current work with `apply`; changing an older checkpoint must branch and `resume` that exact step.
5. Validate using [references/quality-gates.md](references/quality-gates.md). State which gates are observed, which are inferred, and which remain unavailable.
6. Complete only after the requested visible gates pass. Export GLB or build JSON only when the user explicitly selects an export action.

## Capability routing

Use the governed plugin boundary documented in [../../docs/PLUGIN_GOVERNANCE.md](../../docs/PLUGIN_GOVERNANCE.md). The coordinator owns checkpoints and routing; the DeepSeek modeler is the only model-scene and model-semantics writer; validation remains read-only; export requires a distinct user action. Do not let an adapter or validator bypass these ownership rules.

## Modeling boundary

- Build from silhouette and real scale through structure, category-defining details, materials, optional collision/LOD representations, and validation.
- Treat Illusion primitives and bounded meshes as modular game-asset prototypes. Do not call them production-ready topology.
- A rig hierarchy proves rest-joint organization only. It does not prove skin weights, deformation, IK, expressions, or animation.
- GLB proves that the preview assembly exports. It does not prove import acceptance in Godot, Unity, Unreal, or another DCC.
- Preserve every published checkpoint, human thought, branch point, and correction as part of the reviewable artifact history.

For Simplified Chinese terminology, read [references/category-matrix.zh-CN.md](references/category-matrix.zh-CN.md) and [references/quality-gates.zh-CN.md](references/quality-gates.zh-CN.md) only when the deliverable or conversation requires Chinese.
