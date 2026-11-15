# Capability plugin governance

English | [简体中文](PLUGIN_GOVERNANCE.zh-CN.md)

Illusion remains one installable DSH package while its responsibilities are governed as capability plugins. This keeps installation simple without allowing one unbounded implementation to own planning, modeling, validation, and delivery.

## Built-in plugins

| Plugin | Owns | Mutation scope | Risk |
| --- | --- | --- | --- |
| `illusion.coordinator` | history, review, Plan routing | none | read-only |
| `illusion.deepseek-modeler` | scene modeling, game-asset taxonomy | `model-scene`, `model-semantics` | model-write |
| `illusion.game-semantics` | pivot, bounds, sockets, colliders, slots, grids, LOD validation | none | read-only |
| `illusion.technical-validator` | observable quality findings | none | read-only |
| `illusion.2d-art` | 2D briefs, Style Contracts, production plans | `art-direction` | content-write |
| `illusion.2d-validator` | structural and style-contract checks | none | read-only |
| `illusion.export-coordinator` | Build JSON and GLB delivery | `download-artifact` | artifact-write |

The coordinator resolves dependencies before dependants and rejects missing requirements, dependency cycles, declared conflicts, duplicate capability providers, and duplicate mutation owners. Prompt guidance is composed from the resolved plan, so the manifests affect runtime behavior rather than serving only as documentation.

## Invariants

- One capability has one provider in a resolved plan.
- One mutable scope has one owner.
- DeepSeek Modeler is the only plugin allowed to change model scene or model semantics.
- Validation is read-only and cannot silently repair a model.
- Export is separately authorized by a user action and cannot claim target-engine acceptance.
- Agent roles and capability plugins are related but distinct: an Agent role decides and hands off work; a plugin owns runtime capability and state boundaries.

## Extension path

Third-party capabilities register a `CapabilityPluginManifest` with a stable ID, semantic version, API version, provided capabilities, dependencies, conflicts, mutation scopes, risk level, and optional bounded prompt guidance. They can be selected as a subset; required plugins are pulled in automatically.

Physical npm-package separation is deferred until a capability needs an independent release or dependency surface. The current governance contract provides the seam without falsely claiming that four separately installed DSH plugins already exist.

Likely future plugins are engine-specific import adapters, topology/UV production, animation/deformation, and asset-library composition. Each must have an acceptance suite before it gains a mutation scope.
