import type { Context } from '@deepseek-ai/cordis'

import {
  BUILD_LIMITS,
  BUILD_PHASE_VALUES,
  parseBuildCommand,
  type BuildSnapshot,
} from './protocol.js'
import { createBuiltinPluginPlan } from './plugins/builtins.js'
import { BuildStore } from './store.js'
import { ART_LIMITS, parseArtCommand, type ArtSnapshot } from './art/protocol.js'
import { ArtStore } from './art/store.js'

export const name = 'dsh-illusion'
export const inject = ['tools', 'systemPrompt']

interface ToolExecution {
  readonly agent: unknown
  readonly signal: AbortSignal
}

interface ToolResult {
  readonly summary: string
  readonly snapshot: BuildSnapshot | ArtSnapshot
}

interface ToolDefinition {
  readonly name: string
  readonly description: string
  readonly parameters: Record<string, unknown>
  readonly output: {
    readonly schema: Record<string, unknown>
    readonly render: (args: unknown, value: ToolResult) => readonly { type: 'text'; text: string }[]
    readonly presentationMeta: (args: unknown, value: ToolResult) => Record<string, unknown>
  }
  readonly execute: (args: unknown, exec: ToolExecution) => Promise<ToolResult>
}

interface ToolsService {
  register(definition: ToolDefinition): () => void
}

interface SystemPromptService {
  section(section: {
    readonly name: string
    readonly order: number
    readonly text: string
    readonly interpolate?: boolean
  }): () => void
}

const vec3Schema = {
  type: 'array',
  minItems: 3,
  maxItems: 3,
  items: { type: 'number' },
} as const

const vec2Schema = {
  type: 'array',
  minItems: 2,
  maxItems: 2,
  items: { type: 'number' },
} as const

const triangleSchema = {
  type: 'array',
  minItems: 3,
  maxItems: 3,
  items: { type: 'integer', minimum: 0 },
} as const

const geometrySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind'],
  description: 'Procedural or custom geometry. Local coordinates are right-handed [x, y, z] with Z up.',
  properties: {
    kind: {
      type: 'string',
      enum: ['box', 'sphere', 'cylinder', 'cone', 'torus', 'capsule', 'ellipsoid', 'plane', 'lathe', 'tube', 'mesh'],
    },
    width: { type: 'number', exclusiveMinimum: 0 },
    height: { type: 'number', exclusiveMinimum: 0 },
    depth: { type: 'number', exclusiveMinimum: 0 },
    radius: { type: 'number', exclusiveMinimum: 0 },
    tube: { type: 'number', exclusiveMinimum: 0 },
    radii: {
      ...vec3Schema,
      description: 'Positive ellipsoid radii in [x, y, z] order.',
    },
    profile: {
      type: 'array',
      minItems: 2,
      maxItems: BUILD_LIMITS.lathePoints,
      items: vec2Schema,
      description: 'Lathe profile points in [radius, z] order.',
    },
    path: {
      type: 'array',
      minItems: 2,
      maxItems: BUILD_LIMITS.pathPoints,
      items: vec3Schema,
      description: 'Tube centerline points in local [x, y, z] coordinates.',
    },
    closed: { type: 'boolean' },
    vertices: {
      type: 'array',
      minItems: 3,
      maxItems: BUILD_LIMITS.meshVerticesPerObject,
      items: vec3Schema,
      description: 'Custom-mesh vertices in local [x, y, z] coordinates.',
    },
    triangles: {
      type: 'array',
      minItems: 1,
      maxItems: BUILD_LIMITS.meshTrianglesPerObject,
      items: triangleSchema,
      description: 'Counter-clockwise vertex-index triangles viewed from outside.',
    },
  },
} as const

const objectSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'geometry'],
  description: 'A stable character or scene part. parentId creates a local-transform assembly hierarchy.',
  properties: {
    id: { type: 'string', maxLength: BUILD_LIMITS.text },
    label: { type: 'string', maxLength: BUILD_LIMITS.text },
    role: {
      type: 'string',
      maxLength: BUILD_LIMITS.text,
      description: 'Semantic role such as body.head, face.eye.left, hair.front, clothing.coat, or accessory.weapon.',
    },
    parentId: {
      type: 'string',
      maxLength: BUILD_LIMITS.text,
      description: 'Optional parent part ID. Position, rotation, and scale become local to the parent.',
    },
    geometry: geometrySchema,
    position: {
      ...vec3Schema,
      description: 'Local position in [x, y, z] order. Z is vertical; do not use Y as the up axis.',
    },
    rotation: {
      ...vec3Schema,
      description: 'Local right-handed Euler rotation in DEGREES, in [x, y, z] order. Never use radians.',
    },
    scale: {
      ...vec3Schema,
      description: 'Local scale in [x, y, z] order.',
    },
    color: { type: 'string', description: 'Six-digit hex RGB base color.' },
    opacity: { type: 'number', minimum: 0, maximum: 1 },
    roughness: { type: 'number', minimum: 0, maximum: 1 },
    metalness: { type: 'number', minimum: 0, maximum: 1 },
    emissive: { type: 'string', description: 'Six-digit hex RGB emissive color.' },
    doubleSided: { type: 'boolean' },
  },
} as const

const jointSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id'],
  description: 'A reviewable rig joint. This records hierarchy and rest pose, not skin weights.',
  properties: {
    id: { type: 'string', maxLength: BUILD_LIMITS.text },
    label: { type: 'string', maxLength: BUILD_LIMITS.text },
    role: { type: 'string', maxLength: BUILD_LIMITS.text },
    parentId: { type: 'string', maxLength: BUILD_LIMITS.text },
    position: {
      ...vec3Schema,
      description: 'Local joint position in [x, y, z] with Z up.',
    },
    rotation: {
      ...vec3Schema,
      description: 'Local rest rotation in degrees.',
    },
  },
} as const

const localizedStepTextSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title'],
  properties: {
    title: { type: 'string', maxLength: BUILD_LIMITS.text },
    note: { type: 'string', maxLength: BUILD_LIMITS.text },
  },
} as const

const assetSemanticsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['pivot', 'bounds'],
  description: 'Game-engine semantics for the selected checkpoint. References must resolve to scene object IDs.',
  properties: {
    pivot: {
      type: 'object', additionalProperties: false, required: ['position'],
      properties: { position: vec3Schema, rotation: vec3Schema },
    },
    bounds: {
      type: 'object', additionalProperties: false, required: ['min', 'max'],
      properties: { min: vec3Schema, max: vec3Schema },
    },
    modularGrid: {
      type: 'object', additionalProperties: false, required: ['size'],
      properties: { size: vec3Schema, origin: vec3Schema },
    },
    sockets: {
      type: 'array', maxItems: 128, items: {
        type: 'object', additionalProperties: false, required: ['id'],
        properties: { id: { type: 'string' }, label: { type: 'string' }, parentId: { type: 'string' }, position: vec3Schema, rotation: vec3Schema },
      },
    },
    colliders: {
      type: 'array', maxItems: 128, items: {
        type: 'object', additionalProperties: false, required: ['id', 'shape'],
        properties: {
          id: { type: 'string' }, label: { type: 'string' }, ownerId: { type: 'string' },
          shape: { type: 'string', enum: ['box', 'sphere', 'capsule'] }, center: vec3Schema,
          size: vec3Schema, radius: { type: 'number', exclusiveMinimum: 0 }, height: { type: 'number', exclusiveMinimum: 0 }, trigger: { type: 'boolean' },
        },
      },
    },
    materialSlots: {
      type: 'array', maxItems: 64, items: {
        type: 'object', additionalProperties: false, required: ['id', 'objectIds'],
        properties: { id: { type: 'string' }, label: { type: 'string' }, objectIds: { type: 'array', minItems: 1, items: { type: 'string' } } },
      },
    },
    lodGroups: {
      type: 'array', maxItems: 32, items: {
        type: 'object', additionalProperties: false, required: ['id', 'levels'],
        properties: {
          id: { type: 'string' },
          levels: { type: 'array', minItems: 1, maxItems: 8, items: {
            type: 'object', additionalProperties: false, required: ['level', 'screenCoverage', 'objectIds'],
            properties: {
              level: { type: 'integer', minimum: 0 }, screenCoverage: { type: 'number', minimum: 0, maximum: 1 },
              objectIds: { type: 'array', minItems: 1, items: { type: 'string' } },
            },
          } },
        },
      },
    },
  },
} as const

const parameters = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'title'],
  properties: {
    action: {
      type: 'string',
      enum: ['start', 'apply', 'complete', 'resume'],
      description: 'start resets the scene; apply adds one visible step; complete seals the build; resume restores an exact live branch checkpoint.',
    },
    title: {
      type: 'string',
      maxLength: BUILD_LIMITS.text,
      description: `Short human-readable name for this construction step, at most ${BUILD_LIMITS.text} characters.`,
    },
    note: {
      type: 'string',
      maxLength: BUILD_LIMITS.text,
      description: `Optional concise explanation of what changed and why, at most ${BUILD_LIMITS.text} characters.`,
    },
    translations: {
      type: 'object',
      additionalProperties: false,
      description: 'Localized visible step text. Always provide zh-CN so the viewer can switch between English and Chinese.',
      properties: {
        en: localizedStepTextSchema,
        'zh-CN': localizedStepTextSchema,
      },
    },
    phase: {
      type: 'string',
      enum: BUILD_PHASE_VALUES,
      description: 'Visible production phase. Character builds should advance through blockout, anatomy, identity parts, rig, and validation.',
    },
    profile: {
      type: 'object',
      additionalProperties: false,
      required: ['kind'],
      description: 'Set only on start. Use game-asset for categorized game production, character for the legacy character workflow, or object for an uncategorized assembly.',
      properties: {
        kind: { type: 'string', enum: ['object', 'character', 'game-asset'] },
        category: { type: 'string', enum: ['humanoid', 'creature', 'building', 'vehicle', 'prop', 'vegetation', 'terrain', 'environment'] },
        archetype: { type: 'string', maxLength: BUILD_LIMITS.text },
        style: { type: 'string', enum: ['realistic', 'stylized', 'anime', 'low-poly', 'voxel', 'custom'] },
        usage: { type: 'string', enum: ['static', 'skeletal', 'modular', 'environment'] },
        target: { type: 'string', enum: ['static', 'game', 'mmd', 'vtuber', 'interactive', 'print', 'generic', 'godot', 'unity', 'unreal', 'web', 'custom'] },
        unit: { type: 'string', enum: ['m', 'cm', 'mm'] },
        height: { type: 'number', exclusiveMinimum: 0 },
      },
    },
    sourceBuildId: {
      type: 'string',
      maxLength: BUILD_LIMITS.text,
      description: 'Required only for resume. Build ID of the live checkpoint selected by the branch UI.',
    },
    sourceStep: {
      type: 'integer',
      minimum: 1,
      description: 'Required only for resume. Published step number to restore.',
    },
    semantics: assetSemanticsSchema,
    operations: {
      type: 'array',
      maxItems: BUILD_LIMITS.operations,
      description: 'Atomic scene and rig mutations. Prefer one reviewable modeling step per tool call.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type'],
        properties: {
          type: {
            type: 'string',
            enum: ['upsert', 'remove', 'clear', 'upsert_joint', 'remove_joint', 'clear_rig'],
          },
          id: { type: 'string', description: 'Required for remove and remove_joint.' },
          object: objectSchema,
          joint: jointSchema,
        },
      },
    },
  },
} as const

const outputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'snapshot'],
  properties: {
    summary: { type: 'string' },
    snapshot: { type: 'object', additionalProperties: true },
  },
} as const

const artRectSchema = {
  type: 'object', additionalProperties: false,
  required: ['id', 'x', 'y', 'width', 'height', 'fill'],
  properties: {
    id: { type: 'string', maxLength: ART_LIMITS.text },
    x: { type: 'integer', minimum: 0 }, y: { type: 'integer', minimum: 0 },
    width: { type: 'integer', minimum: 1 }, height: { type: 'integer', minimum: 1 },
    fill: { type: 'string', description: 'Six-digit hex RGB color.' },
  },
} as const

const artParameters = {
  type: 'object', additionalProperties: false,
  required: ['action', 'title', 'phase', 'frameWidth', 'frameHeight', 'frames'],
  properties: {
    action: { type: 'string', enum: ['start', 'apply', 'complete'] },
    title: { type: 'string', maxLength: ART_LIMITS.text },
    note: { type: 'string', maxLength: ART_LIMITS.text },
    translations: parameters.properties.translations,
    phase: { type: 'string', enum: ['brief', 'style', 'composition', 'draft', 'pixel-cleanup', 'lineart', 'color', 'render', 'slicing', 'validation', 'complete'] },
    frameWidth: { type: 'integer', minimum: 1, maximum: ART_LIMITS.frameSize },
    frameHeight: { type: 'integer', minimum: 1, maximum: ART_LIMITS.frameSize },
    frames: {
      type: 'array', minItems: 1, maxItems: ART_LIMITS.frames,
      items: {
        type: 'object', additionalProperties: false, required: ['id', 'label', 'rects'],
        properties: {
          id: { type: 'string', maxLength: ART_LIMITS.text },
          label: { type: 'string', maxLength: ART_LIMITS.text },
          translations: parameters.properties.translations,
          rects: { type: 'array', maxItems: ART_LIMITS.rectsPerFrame, items: artRectSchema },
          objects: {
            type: 'array', maxItems: ART_LIMITS.objectsPerFrame,
            description: 'Semantic composition layers. Reuse stable object IDs across revisions and animation frames.',
            items: {
              type: 'object', additionalProperties: false, required: ['id', 'label', 'rects'],
              properties: {
                id: { type: 'string', maxLength: ART_LIMITS.text },
                label: { type: 'string', maxLength: ART_LIMITS.text },
                role: { type: 'string', maxLength: ART_LIMITS.text },
                zIndex: { type: 'integer', minimum: -10_000, maximum: 10_000 },
                locked: { type: 'boolean' },
                rects: { type: 'array', minItems: 1, maxItems: ART_LIMITS.rectsPerFrame, items: artRectSchema },
              },
            },
          },
        },
      },
    },
  },
} as const

const builtinPluginPlan = createBuiltinPluginPlan()

export function apply(ctx: Context): void {
  const stores = new WeakMap<object, BuildStore>()
  const artStores = new WeakMap<object, ArtStore>()
  const fallbackStore = new BuildStore()
  const fallbackArtStore = new ArtStore()
  const snapshots = new Map<string, Map<number, BuildSnapshot>>()
  const tools = (ctx as Context & { tools: ToolsService }).tools
  const systemPrompt = (ctx as Context & { systemPrompt: SystemPromptService }).systemPrompt

  ctx.effect(
    () => systemPrompt.section({
      name: 'tool:illusion-build',
      order: 5_800,
      interpolate: false,
      text: [
        ...builtinPluginPlan.promptSections,
        'When creating or modifying a 3D model and illusion_build is available, keep its visual construction record in sync.',
        'When the user asks DeepSeek to assemble the model in Illusion, DeepSeek owns the modeling decisions and must build it directly through tool operations rather than asking the user to author the parts.',
        'Call start before the first modeling operation, apply for one meaningful visible geometry change, and complete only after validation.',
        'Choose the construction workflow as the modeler. In interactive mode, publish one semantic checkpoint and stop for review. In Plan execution mode, first divide the work into coherent semantic nodes, then publish each node with a separate illusion_build call and continue automatically to the requested node or finished model. Never merge several planned nodes into one call because every published node must remain independently visible, editable, exportable, and branchable in chat history.',
        'After an interactive checkpoint, the requested Plan target, or the completed model, ask whether it matches the user expectation. Mention that they may reply with text, attach reference files with a description, run the plan to a named node or completion, export the checkpoint, or branch from it. Treat attached feedback as a revision of the selected checkpoint, reuse stable IDs, publish exactly one correction step, and stop again.',
        'A completed build may be reopened with action=apply when the user requests a change; validate it again before calling complete. When feedback targets an older step, the client creates a branch and first resumes that exact checkpoint.',
        'Never start over for a refinement unless the user explicitly requests a new build. In a branched session, first use action=resume with the sourceBuildId and sourceStep supplied by the branch request; do not imitate a resume with a new start.',
        'For a game asset, start with profile.kind=game-asset and choose a category, archetype, style, usage, engine target, and unit. Work from silhouette and scale through structure, category-defining details, materials, optional collision and LOD representations, then validation. A preview is not game-ready unless the requested pivot, modular boundaries, collision intent, scale, and export target have been stated and checked.',
        'For a complex humanoid, creature, or mascot, start with profile.kind=character and advance through reviewable phases: blockout, anatomy, face, hair, clothing, accessories, materials, rig, expressions, and validation as applicable.',
        'Use stable semantic IDs, role labels, and parentId hierarchies. Parent-relative transforms are local. Prefer capsules and ellipsoids for body volumes, tubes for hair or tails, lathe profiles for rotational forms, planes for panels, and bounded custom meshes for identity-defining shapes.',
        'Build from global proportions to identity features. Add rig joints as a rest-pose review skeleton after the assembly is stable; joint records do not prove skin weights or deformation quality.',
        'The scene uses right-handed [x, y, z] coordinates with Z up, not Y up. Boxes use width=X, depth=Y, height=Z; cylinders and cones point along local Z. Rotations are Euler angles in degrees, never radians.',
        'Illusion can be the editable modular assembly artifact for its JSON and preview GLB exports. If another CAD/DCC tool is used, that tool remains authoritative and its accepted changes should be synchronized here.',
        'Use title and note for observable operations and results. Never put hidden chain-of-thought or private reasoning in them.',
        'Write the canonical title and note in English and always provide a concise Simplified Chinese version in translations.zh-CN so the user can switch the visible build record between English and Chinese.',
      ].join(' '),
    }),
    'dsh-illusion: modeling guidance',
  )

  ctx.effect(
    () => systemPrompt.section({
      name: 'tool:illusion-art',
      order: 5_810,
      interpolate: false,
      text: [
        'When producing pixel art or frame-based 2D art and illusion_art is available, publish the visible work through it instead of hiding the artifact in a file-only response.',
        'Set the exact per-frame width and height. For animation, include stable frame IDs and publish coherent motion frames in order.',
        'In interactive mode, publish one reviewable art step and stop. Ask whether it matches the expectation before continuing.',
        'The reviewer can inspect one enlarged frame at a time and select a pixel or rectangular region. When feedback names a frame and region, preserve every other frame and edit only the requested area unless the user asks for a broader change.',
        'For multi-object composition, put semantic layers in frames[].objects with stable IDs, labels, roles, and zIndex. Keep background, characters, props, effects, and foreground elements independently editable. A locked object must not change unless the reviewer explicitly unlocks it.',
        'Use stable rect IDs across revisions so localized changes remain auditable. Always provide translations.zh-CN for visible titles and notes.',
        'Never include private reasoning in visible art-step text.',
      ].join(' '),
    }),
    'dsh-illusion: 2d art guidance',
  )

  ctx.effect(
    () => tools.register({
      name: 'illusion_build',
      description:
        'Build and publish one visible 3D construction step. Supports hierarchical character parts, procedural and bounded custom geometry, material controls, and reviewable rig joints. Call start first, apply after each meaningful change, and complete after validation. Use right-handed [x, y, z] coordinates with Z up and rotations in degrees, never radians.',
      parameters,
      output: {
        schema: outputSchema,
        render: (_args, value) => [{ type: 'text', text: value.summary }],
        presentationMeta: (_args, value) => ({ illusionSnapshot: value.snapshot }),
      },
      async execute(args, exec) {
        if (exec.signal.aborted) throw exec.signal.reason
        const command = parseBuildCommand(args)
        const agent = exec.agent
        let store = fallbackStore
        if (typeof agent === 'object' && agent !== null) {
          store = stores.get(agent) ?? new BuildStore()
          stores.set(agent, store)
        }
        let snapshot: BuildSnapshot
        if (command.action === 'resume') {
          const source = snapshots.get(command.sourceBuildId ?? '')?.get(command.sourceStep ?? -1)
          if (source === undefined) {
            throw new Error('the requested live branch checkpoint is unavailable after the source Harness process ended')
          }
          snapshot = store.resume(source, command.sourceStep as number, command)
        } else {
          snapshot = store.apply(command)
        }
        let revisions = snapshots.get(snapshot.buildId)
        if (revisions === undefined) {
          revisions = new Map()
          snapshots.set(snapshot.buildId, revisions)
        }
        const publishedStep = snapshot.steps[snapshot.activeStep]?.index ?? snapshot.revision
        revisions.set(publishedStep, snapshot)
        const active = snapshot.steps[snapshot.activeStep]
        const objectCount = active?.objectCount ?? active?.objects?.length ?? 0
        const jointCount = active?.jointCount ?? active?.joints?.length ?? 0
        return {
          summary: `${command.action === 'complete' ? 'Completed' : command.action === 'resume' ? 'Resumed' : 'Updated'} “${snapshot.title}”: step ${snapshot.revision}, ${objectCount} visible part${objectCount === 1 ? '' : 's'}, ${jointCount} rig joint${jointCount === 1 ? '' : 's'}. Review this checkpoint before continuing.`,
          snapshot,
        }
      },
    }),
    'dsh-illusion: illusion_build tool',
  )

  ctx.effect(
    () => tools.register({
      name: 'illusion_art',
      description: 'Publish one reviewable 2D pixel-art step with exact frame dimensions. Frames are shown individually at pixel zoom and can receive coordinate-specific review feedback.',
      parameters: artParameters,
      output: {
        schema: outputSchema,
        render: (_args, value) => [{ type: 'text', text: value.summary }],
        presentationMeta: (_args, value) => ({ illusionArtSnapshot: value.snapshot }),
      },
      async execute(args, exec) {
        if (exec.signal.aborted) throw exec.signal.reason
        const command = parseArtCommand(args)
        let store = fallbackArtStore
        if (typeof exec.agent === 'object' && exec.agent !== null) {
          store = artStores.get(exec.agent) ?? new ArtStore()
          artStores.set(exec.agent, store)
        }
        const snapshot = store.apply(command)
        const step = snapshot.steps[snapshot.activeStep]
        return {
          summary: `${command.action === 'complete' ? 'Completed' : 'Published'} “${snapshot.title}”: step ${snapshot.revision}, ${step?.frames.length ?? 0} reviewable frame${step?.frames.length === 1 ? '' : 's'} at ${command.frameWidth}×${command.frameHeight}. Review frames individually before continuing.`,
          snapshot,
        }
      },
    }),
    'dsh-illusion: illusion_art tool',
  )
}

export { BuildStore } from './store.js'
export { BUILTIN_PLUGIN_MANIFESTS, createBuiltinPluginPlan } from './plugins/builtins.js'
export { PLUGIN_API_VERSION, PluginGovernor } from './plugins/governance.js'
export { materializeBuildScene } from './scene.js'
export { createArtProductionPlan, parseArtStyleContract } from './art/style.js'
export { parseArtCommand } from './art/protocol.js'
export { ArtStore } from './art/store.js'
export { parseBuildCommand } from './protocol.js'
export type {
  AssetCollider,
  AssetLodGroup,
  AssetLodLevel,
  AssetMaterialSlot,
  AssetSemantics,
  AssetSocket,
  BuildCommand,
  BuildOperation,
  BuildPhase,
  BuildProfile,
  BuildSnapshot,
  BuildStep,
  GameAssetBuildProfile,
  GameAssetCategory,
  LocalizedStepText,
  RigJoint,
  SceneObject,
  StepTranslations,
  UiLocale,
} from './protocol.js'
export type {
  CapabilityPluginManifest,
  CapabilityPluginRisk,
  ResolvedPluginPlan,
} from './plugins/governance.js'
export type {
  ArtDeliverable,
  ArtPhase,
  ArtProductionBrief,
  ArtStyleContract,
  ArtStyleFamily,
  ReferenceRights,
  StyleAuthority,
  StyleReference,
} from './art/style.js'
