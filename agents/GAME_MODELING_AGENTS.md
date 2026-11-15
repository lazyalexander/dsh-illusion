# Game modeling agent architecture

English | [简体中文](GAME_MODELING_AGENTS.zh-CN.md)

The machine-readable contract is [game-modeling-agentment.json](game-modeling-agentment.json). “Agentment” is used here as the project's agent-role and handoff specification; it is not a separate runtime framework.

The architecture separates four responsibilities: the asset director normalizes intent, the DeepSeek modeler alone mutates the scene, the technical validator classifies evidence, and the export coordinator handles explicit artifact delivery. This prevents planning, validation, and export from becoming hidden modeling channels.

Each role is bound to a governed capability plugin through `pluginId`. See [Capability plugin governance](../docs/PLUGIN_GOVERNANCE.md) for dependency, conflict, capability ownership, mutation ownership, and risk rules. Roles decide and hand off work; plugins own runtime capabilities and state boundaries.

The first implementation remains a single DeepSeek Harness session. Roles are prompt and artifact boundaries, not four concurrently running agents. Runtime delegation is a later phase and must preserve the same mutation and evidence invariants.

## Handoff records

- `asset-brief`: category, archetype, usage, style, engine target, unit, references, mode, target node, and quality gates.
- `build-snapshot`: immutable Illusion checkpoint, build ID, step, lineage, visible operations, and preview counts.
- `validation-report`: one result per gate: `pass`, `needs-revision`, or `not-observable`, with checkpoint evidence.
- `accepted-checkpoint`: the exact build ID and step approved for export.
- `export-receipt`: artifact format, source checkpoint, filename, and observed structural checks.

## Control flow

The director chooses interactive or Plan execution. The modeler publishes a checkpoint. The validator either accepts it, asks for one bounded correction, or records unavailable evidence. Historical corrections first create a branch. Only an accepted checkpoint can be handed to export, and only an explicit user action authorizes export.
