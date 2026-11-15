# dsh-illusion

English | [简体中文](README.zh-CN.md) | [Release notes](CHANGELOG.md) | [Privacy](PRIVACY.md)

[Game modeling roadmap](docs/GAME_MODELING_ENGINE_ROADMAP.md) | [2D art pipeline](docs/2D_ART_PIPELINE.md) | [Plugin governance](docs/PLUGIN_GOVERNANCE.md) | [Agent architecture](agents/GAME_MODELING_AGENTS.md) | [Game-asset Skill](skills/illusion-game-assets/SKILL.md) | [2D-art Skill](skills/illusion-2d-art/SKILL.md)

`dsh-illusion` is a DeepSeek Harness Web plugin that lets DeepSeek assemble objects and complex modular characters through `illusion_build`. The conversation displays the current 3D scene, construction phases, a rig preview, and a scrub-able history timeline while the model is being built.

The plugin shows auditable modeling operations and intermediate artifacts. It does not read, store, or imitate the model's private chain of thought.

## Features

- Native dual-face DSH plugin: a Host tool plus a Web `tool.call.toolview` card.
- Governed capability graph for coordination, DeepSeek modeling, read-only validation, and explicitly authorized export. Duplicate capabilities or mutation owners fail before runtime use.
- Checkpoint game semantics for pivot, bounds, sockets, colliders, modular grids, material slots, and LOD groups, with deterministic reference validation and GLB metadata export.
- Provider-neutral 2D art direction for pixel, anime, and author-defined styles through versioned Style Contracts and family-specific production plans.
- Categorized `game-asset` profiles for humanoids, creatures, buildings, vehicles, props, vegetation, terrain, and environment kits.
- Every tool call creates one replayable checkpoint. Interactive mode stops after one checkpoint; Plan execution may continue through several separately published nodes to a chosen target or the finished model.
- Published checkpoint cards remain expanded in the DSH transcript instead of being hidden by the generic completed-tool fold. Later corrections create new cards instead of replacing earlier steps.
- The tool card switches between English and Simplified Chinese. The preference is stored in the current browser and synchronized across visible Illusion cards.
- DeepSeek can attach `translations.zh-CN` to every step, so phase labels, operation titles, notes, controls, status, and accessibility text switch together. Older single-language transcripts fall back safely to their original text.
- Every checkpoint accepts text feedback or text plus reference-file uploads. **Yes, continue**, **Send adjustment**, **Run plan / to target**, and **Finish build** submit a bounded next turn directly through DSH.
- Every step also has a browser-local "latest thought" field for private draft notes that are not sent until the user submits a review.
- Any selected timeline step can create and open a real DSH session branch. Editing a historical step automatically branches first; the child restores that exact build state through `action: "resume"` before further modeling.
- Export the selected preview step as a binary glTF (`.glb`) or export the complete build record, including step thoughts, as JSON.
- Three.js viewport with orbit, zoom, shadows, grid, axes, and automatic framing.
- Preview geometry for primitives plus `capsule`, `ellipsoid`, `plane`, `lathe`, `tube`, and bounded custom triangle meshes.
- Hierarchical parts with local transforms, semantic roles, richer materials, and stable IDs that DeepSeek can revise in place.
- Character build profiles, explicit production phases, and a rest-pose joint hierarchy with a visible rig overlay.
- Incremental part and joint operations. Protocol-v2 steps store deltas and retain a replay checkpoint when long histories are compacted.
- Per-Agent in-memory isolation. Snapshots are persisted with tool results, so transcript replay does not depend on the current process state.
- Protocol-v1 transcript compatibility, so existing primitive builds remain replayable.
- Bounded operations, parts, joints, custom meshes, steps, text, and numeric ranges protect the Web UI from unbounded scene data.
- Built-in guidance makes DeepSeek responsible for modeling decisions and observable construction while keeping private reasoning private.

## Install from source

Requires Node.js 22+ and DeepSeek Harness `0.2.2-rc.1` or newer.

```bash
npm install
npm run check
dsh plugin --profile web add /absolute/path/to/dsh-illusion
dsh web
```

If you launch Harness through `npx`, replace the last two commands with their corresponding `npx @deepseek-ai/dsh ...` forms.

Or install the same plugin directly from GitHub:

```bash
dsh plugin --profile web add github:lazyalexander/dsh-illusion
```

## Usage

For a game asset, provide the gameplay category and intended production context:

> Build a stylized modular harbor warehouse as a Godot game asset using `illusion_build`. Use profile kind game-asset, category building, archetype industrial harbor warehouse, usage modular, target godot, and unit m. Publish separate structure, details, collision-intent, and validation checkpoints.

For a complex character, ask DeepSeek:

> Build a stylized high-complexity humanoid character as a live 3D assembly using `illusion_build`. You own all modeling decisions. Work through blockout, anatomy, face, hair, clothing, accessories, materials, rig, and validation. Use stable semantic IDs and parent-child hierarchy, and complete only after a visible validation step.

DeepSeek chooses between two visible workflows:

1. `action: "start"` clears the previous scene and creates the first step.
2. In interactive mode, DeepSeek stops at the next useful checkpoint and asks whether it matches the user's expectation.
3. In Plan execution mode, DeepSeek divides the work into semantic nodes and issues one `illusion_build` call for each node until the requested node or finished model. The run does not pause between nodes, but every node remains a separate history card.
4. Text or attached-reference feedback produces exactly one `action: "apply"` correction. **Yes, continue** advances one node; **Run plan / to target** lets DeepSeek choose and execute a longer bounded route.
5. `action: "complete"` marks the build complete after validation. Later feedback may reopen it with `action: "apply"` and validate it again. `action: "resume"` restores the exact selected checkpoint in a newly created DSH branch.

Example character arguments:

```json
{
  "action": "start",
  "title": "Character blockout",
  "note": "Establish the global proportions before identity features",
  "translations": {
    "zh-CN": {
      "title": "人偶大形",
      "note": "先建立整体比例，再处理身份特征"
    }
  },
  "phase": "blockout",
  "profile": {
    "kind": "character",
    "style": "stylized",
    "target": "interactive",
    "unit": "m",
    "height": 1.7
  },
  "operations": [
    {
      "type": "upsert",
      "object": {
        "id": "torso",
        "label": "Torso blockout",
        "role": "anatomy.torso",
        "geometry": { "kind": "capsule", "radius": 0.18, "height": 0.55 },
        "position": [0, 0, 1.12],
        "scale": [1, 0.72, 1],
        "color": "#d7b79f",
        "material": { "roughness": 0.8, "metalness": 0 }
      }
    }
  ]
}
```

Coordinates use a right-handed `[x, y, z]` system with Z up. Boxes map `width` to X, `depth` to Y, and `height` to Z. Cylinders, cones, capsules, lathes, and tubes point along local Z before rotation. Child transforms are local to `parentId`. Rotations are Euler angles in degrees in `[x, y, z]` order; radians are not accepted. Colors must be six-digit hexadecimal RGB values.

### Complex character workflow

DeepSeek owns the assembly sequence and can revise earlier parts by stable ID. The recommended visible progression is reference and blockout, anatomy and proportions, face and identity features, hair, clothing, accessories and materials, rest rig, validation, then completion. Each accepted call becomes a reviewable delta rather than a hidden modeling jump.

The protocol accepts at most 64 operations per call, 256 parts, 256 joints, and 96 replay steps. Custom meshes are intentionally bounded. These limits support detailed modular characters without turning the browser preview into a sculpting or retopology engine.

### Review, annotate, and export

Use the **EN / 中文** switch in the card header to change the interface and any localized step titles or notes. The selected language survives page reloads. Select any timeline step to inspect that scene. The **Your latest thought / 你在这一步的最新想法** field stores one note per build step in the current browser and restores it after a page reload. Use it for the newest human direction, such as a proportion to change or an accepted feature to preserve.

Every selected timeline step has an interactive review panel. Submitting work from an older step automatically creates a child session, resumes that exact checkpoint, and applies the request there so later history is never overwritten:

- **Yes, continue** tells DeepSeek that the checkpoint is accepted and permits one next visible step.
- **Send adjustment** sends the written direction and any selected reference files through DSH, asks DeepSeek to revise stable IDs in place, and permits one correction step.
- **Run plan / to target** lets DeepSeek publish one card per semantic plan node and continue automatically to the goal written in the latest-thought field, or to the next useful review point.
- **Finish build** permits one final validation or completion step.
- **Branch from this step** forks the DSH transcript, opens the child session, and submits a bounded `resume` request for the currently selected timeline state.

Each resulting step is a separate tool call and history card, even when Plan execution publishes several nodes in one model turn. Illusion automatically keeps those cards expanded; scrubbing inside a newer card never mutates an earlier card.

- **Export step GLB** downloads the currently selected preview scene as a binary glTF file. Meshes retain their Illusion object IDs and protocol transform metadata.
- **Export build JSON** downloads the complete immutable build snapshot together with the selected step and all browser-local step thoughts. This is the portable record for review or transfer.

## Boundary with CAD and Blender

Illusion supports high-complexity modular assembly, but it is not a BRep kernel, sculpting system, mesh boolean engine, or full DCC executor. A real modeling plugin can synchronize proxy geometry to `illusion_build` after each authoritative operation. Future adapters can translate events from `dsh-cad`, Blender, or a proprietary modeling tool into the same protocol.

The joint hierarchy is a reviewable rest skeleton. It does not claim skin weights, IK, blendshapes, deformation quality, or motion acceptance. The exported GLB is an editable preview assembly with part and joint metadata; an external DCC remains authoritative when dense sculpting, retopology, UV work, skinning, or production animation is required.

This boundary is intentional: DeepSeek owns modeling decisions and calls the construction protocol; Illusion owns bounded scene state, validation, replay, human notes, and export.

## Game modeling engine direction

The current release implements Stage 1 of the [game modeling engine roadmap](docs/GAME_MODELING_ENGINE_ROADMAP.md): a shared asset taxonomy, cross-category benchmark catalog, reusable Skill, and machine-readable Agentment role contract. The catalog contains humanoid and creature cases, four building archetypes, and representative vehicle, prop, vegetation, terrain, and environment cases.

The [Illusion Game Assets Skill](skills/illusion-game-assets/SKILL.md) defines the reusable modeling and evidence workflow. The [Agent architecture](agents/GAME_MODELING_AGENTS.md) separates brief normalization, DeepSeek-owned scene mutation, technical validation, and explicit export. These are currently role and handoff boundaries inside one Harness workflow, not a claim that four runtime agents are already deployed.

The [capability plugin governance contract](docs/PLUGIN_GOVERNANCE.md) keeps the release as one installable DSH package while enforcing separate capability and mutation ownership. Physical package splitting is reserved for capabilities that later need an independent dependency or release surface.

Stage 2 now records and validates checkpoint game semantics, while target-engine import probes remain pending. Stages 3–6 add mesh/material production, deformation and animation, target-engine adapters, then a versioned asset library and world composition. Gameplay collision, UVs, production topology, skinning, runtime LOD switching, and engine import remain explicit evidence gaps rather than implied capabilities.

## 2D art direction

The [2D art pipeline](docs/2D_ART_PIPELINE.md) treats style as author-owned intent captured in a versioned contract. Illusion can propose missing traits, but cannot accept its own proposal. Pixel, anime, and custom styles share review history while retaining different production and validation gates. This release provides the contract, planning, governance, Agentment, and fixtures; a connected image-provider adapter is still required for actual raster generation or editing.

### DSH-native pixel demonstration

The [Coastal Courier SVG](examples/dsh-2d-demo/coastal-courier.svg) and [rendered PNG](examples/dsh-2d-demo/coastal-courier.png) demonstrate a provider-free DSH path: DeepSeek authored a bounded 64×64 layout of 40 rectangles and 12 colors, then Illusion validated and rendered it. The [run evidence](examples/dsh-2d-demo/run-evidence.json) records an important limitation: both DSH attempts were stopped after the deterministic layout appeared in the run stream but before a final response, because the model kept over-refining. This is valid pixel-structure evidence, not proof of a production raster provider or a smooth interactive workflow.

The 2D review card displays one frame at pixel zoom, exposes semantic composition objects, and includes a local pencil, eraser, eyedropper, undo, and redo workflow. Editor changes remain a browser-local overlay until **Save as iteration reference** is selected. A later **Adjust selected area** submission automatically attaches the edited PNG and a deterministic `dsh-illusion/editor-patch@1` JSON file; the prompt marks both as the authoritative reference while preserving the original checkpoint.

DSH Web also shows an **Illusion · Drawing mode** switch in the composer toolbar. Switching it on submits an explicit, visible session instruction that makes later visual requests prefer `illusion_art`; switching it off submits the matching exit instruction. The switch does not hide tools or silently alter model requests, and unrelated non-visual prompts remain ordinary conversation.

## Privacy

The plugin has no telemetry and makes no direct third-party requests. Build snapshots become part of DSH tool-result metadata. Step thoughts and the language preference stay in browser `localStorage`; JSON and GLB files are created only after an explicit export action. When the user selects **Send adjustment**, chosen files and review text are deliberately passed to DSH's session upload and prompt services and may reach the configured model provider. See the complete [privacy statement](PRIVACY.md).

The repository's current files and reachable Git history are checked by `npm run audit:public` for common credentials, personal home paths, sensitive local files, and embedded PNG metadata. The prebuilt client includes Three.js; see [third-party notices](THIRD_PARTY_NOTICES.md).

## Development

```bash
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

Key files:

- `src/protocol.ts`: stable event protocol and runtime validation.
- `src/scene.ts`: delta replay, hierarchy validation, and scene materialization.
- `src/store.ts`: per-Agent build state and history snapshots.
- `src/index.ts`: DSH Host tool and prompt-guidance registration.
- `src/plugins/`: capability manifests, dependency resolution, conflict checks, and exclusive mutation ownership.
- `src/art/style.ts`: provider-neutral Style Contract parsing and family-specific 2D production planning.
- `src/client/index.tsx`: Web tool-view slot registration.
- `src/client/SceneViewport.tsx`: Three.js scene projection.
- `src/client/sceneObjects.ts`: shared preview mesh construction for the viewport and GLB export.
- `src/client/thoughts.ts`: bounded browser-local annotations keyed by build and step.
- `src/client/review.ts`: deterministic review, adjustment, finish, and branch prompts.
- `src/client/export.ts`: Build JSON and selected-step GLB export.
- `benchmarks/game-asset-catalog.json`: cross-category game-asset acceptance catalog.
- `skills/illusion-game-assets/`: reusable modeling Skill and bilingual category/quality references.
- `agents/game-modeling-agentment.json`: machine-readable role and handoff invariants.
- `agents/2d-art-agentment.json`: machine-readable author, provider, validation, and approval boundaries.

## End-to-end validation

The final acceptance run was completed on 2026-11-14 with DeepSeek Harness `0.2.2-rc.1`, the real Web client, and `DeepSeek-V4.1-Flash` at High reasoning effort. An isolated profile keeps the result independent from unrelated installed plugins:

```bash
export ILLUSION_E2E_HOME="$(mktemp -d)"
DSH_HOME="$ILLUSION_E2E_HOME" dsh plugin --profile illusion-test add /absolute/path/to/dsh-illusion
DSH_HOME="$ILLUSION_E2E_HOME" dsh --profile illusion-test --no-open --host 127.0.0.1 --port 0
```

Open the printed local URL and submit this prompt:

> Build a stylized high-complexity humanoid character as a live 3D assembly using illusion_build. You own all modeling decisions. Do not use any other tools and do not modify files. Start with profile kind character, style anime, target interactive, unit m, height 1.7, and phase blockout. Use at least six separate apply steps covering anatomy, face, hair, clothing, accessories or materials, and rig or validation. Use stable semantic IDs and parentId hierarchy. Across the build use capsule, ellipsoid, tube, plane, lathe, and one small custom mesh, with distinct materials. Add a humanoid rest-pose joint hierarchy including hips, spine, chest, neck, head, arms, and legs. Complete only after a visible validation step. Keep every step within the tool schema.

Observed evidence:

- DeepSeek was the only modeler. It completed the run in 2 minutes 7 seconds with 11 accepted, replayable steps: blockout, anatomy, face, hair, clothing, accessories/materials, rig, validation, one corrective face-fit pass, and completion.
- The final character measured 1.70 m and contained 100 visible parts plus a 21-joint humanoid rest hierarchy. The scene used capsules, ellipsoids, tubes, planes, lathes, and a bounded custom mesh.
- During validation, DeepSeek detected floating facial surface elements and inserted a corrective step before calling `complete`.
- The browser displayed the complete stylized anime character, its rig overlay, the phased timeline, and a per-step latest-thought field. This was a visual modular-assembly check, not a deformation or animation-quality approval.
- The downloaded Build JSON used schema `dsh-illusion/build-export@1` and protocol 2. It contained 11 delta steps, 128 operations, the character profile, and no repeated legacy object snapshots.
- The downloaded GLB had a valid glTF 2.0 binary header, 100 meshes, 100 part nodes, and 21 joint nodes, with build-profile and rig metadata.
- One initial operation used invalid colors without the required `#`. Runtime validation rejected it atomically, DeepSeek corrected the call, and the failed attempt created no accepted snapshot.
- The checkpoint-review acceptance used a tank blockout to test interaction rather than model quality. DeepSeek published exactly one three-part step in 13 seconds and stopped for confirmation. A card-originated text adjustment produced exactly one correction step in 9 seconds while preserving stable IDs and the original card. Branching from step 1 created a child DSH session, restored the exact three-part checkpoint in 3 seconds, and asked for confirmation before continuing.
- A submarine Plan-mode acceptance then completed in 1 minute 54 seconds. DeepSeek chose five semantic construction nodes—pressure hull; conning tower and viewports; diving planes and propulsion; ballast and research payload; trim and validation—followed by a separate completion seal. All six submarine cards stayed expanded in one model turn; each retained export, review, target-plan, and branch controls. The result contained 58 visible modular parts and no rig.
- The cross-category game-asset smoke completed in 2 minutes 53 seconds. DeepSeek independently completed humanoid, creature, building, vehicle, prop, vegetation, terrain, and environment builds with 19, 19, 14, 15, 15, 15, 13, and 19 parts. The transcript retained 24 game-asset cards, each with review, Plan, branch, and export controls.
- A separate building-variety run completed a civic clock tower, industrial harbor warehouse, and fantasy mountain temple in 1 minute 50 seconds. Each used 19 structural parts plus one validation part and retained four cards. Together with the townhouse, live evidence now covers four distinct building archetypes.
- That 24-card run exposed browser WebGL-context exhaustion when every historical preview rendered eagerly. The client now mounts only previews within a 600 px viewport margin. Browser revalidation showed two live viewports, 22 deferred cards, and the visible humanoid preview rendering correctly while all card controls remained present.
- `npm run check` passes nine test files with 35 tests, validates 11 catalog cases, eight category smokes, three additional building smokes, four Agentment roles, then completes Host/Client builds.

## Known limitations

- A new snapshot appears after a tool call finishes; one call does not mutate the scene token by token. Interactive mode publishes one checkpoint per user turn, while Plan mode may publish several separate calls and cards in that turn.
- Historical cards remain fully interactive, but their WebGL preview is mounted only when the card is near the visible browser area; scrolling it near the screen restores the live viewport.
- High complexity currently means modular procedural assembly, not a dense sculpted production mesh.
- The rest rig has no skin weights, IK, blendshapes, deformation validation, or motion test.
- The GLB export is a preview assembly, not a VRM/MMD-ready character or authoritative DCC artifact.
- Dense sculpting, retopology, UV layout, texture painting, skinning, and production animation still require an external DCC workflow.
- Step thoughts are stored in the current browser rather than the DSH transcript. They do not synchronize across browsers or devices; export the Build JSON to carry them elsewhere.
- Live branch restoration uses the running plugin's checkpoint registry. Historical cards and exports survive a Harness restart, but automatic `resume` into a new branch currently requires the source process to remain running.
- Provider acceptance used an isolated profile and does not establish compatibility with every third-party plugin combination.
- The visual pass covered desktop Chrome and one stylized humanoid; mobile layouts, other WebGL implementations, and authoritative CAD/DCC adapters remain outside this acceptance scope.
