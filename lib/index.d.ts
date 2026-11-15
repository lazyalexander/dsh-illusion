import { Context } from "@deepseek-ai/cordis";

//#region src/protocol.d.ts
declare const LEGACY_PROTOCOL_VERSION: 1;
declare const PROTOCOL_VERSION: 2;
type ProtocolVersion = typeof LEGACY_PROTOCOL_VERSION | typeof PROTOCOL_VERSION;
type UiLocale = 'en' | 'zh-CN';
type BuildStatus = 'building' | 'complete';
type BuildPhase = 'reference' | 'silhouette' | 'blockout' | 'structure' | 'anatomy' | 'face' | 'hair' | 'clothing' | 'accessories' | 'materials' | 'details' | 'collision' | 'lod' | 'rig' | 'expressions' | 'validation' | 'assembly' | 'complete';
type GeometryKind = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'capsule' | 'ellipsoid' | 'plane' | 'lathe' | 'tube' | 'mesh';
type Vec2 = readonly [number, number];
type Vec3 = readonly [number, number, number];
type Triangle = readonly [number, number, number];
interface SceneGeometry {
  readonly kind: GeometryKind;
  readonly width?: number;
  readonly height?: number;
  readonly depth?: number;
  readonly radius?: number;
  readonly tube?: number;
  readonly radii?: Vec3;
  readonly profile?: readonly Vec2[];
  readonly path?: readonly Vec3[];
  readonly closed?: boolean;
  readonly vertices?: readonly Vec3[];
  readonly triangles?: readonly Triangle[];
}
interface SceneObject {
  readonly id: string;
  readonly label: string;
  readonly role?: string;
  readonly parentId?: string;
  readonly geometry: SceneGeometry;
  readonly position: Vec3;
  readonly rotation: Vec3;
  readonly scale: Vec3;
  readonly color: string;
  readonly opacity: number;
  readonly roughness: number;
  readonly metalness: number;
  readonly emissive: string;
  readonly doubleSided: boolean;
}
interface RigJoint {
  readonly id: string;
  readonly label: string;
  readonly role: string;
  readonly parentId?: string;
  readonly position: Vec3;
  readonly rotation: Vec3;
}
interface AssetSocket {
  readonly id: string;
  readonly label: string;
  readonly parentId?: string;
  readonly position: Vec3;
  readonly rotation: Vec3;
}
interface AssetCollider {
  readonly id: string;
  readonly label: string;
  readonly ownerId?: string;
  readonly shape: 'box' | 'sphere' | 'capsule';
  readonly center: Vec3;
  readonly size?: Vec3;
  readonly radius?: number;
  readonly height?: number;
  readonly trigger: boolean;
}
interface AssetMaterialSlot {
  readonly id: string;
  readonly label: string;
  readonly objectIds: readonly string[];
}
interface AssetLodLevel {
  readonly level: number;
  readonly screenCoverage: number;
  readonly objectIds: readonly string[];
}
interface AssetLodGroup {
  readonly id: string;
  readonly levels: readonly AssetLodLevel[];
}
interface AssetSemantics {
  readonly pivot: {
    readonly position: Vec3;
    readonly rotation: Vec3;
  };
  readonly bounds: {
    readonly min: Vec3;
    readonly max: Vec3;
  };
  readonly modularGrid?: {
    readonly size: Vec3;
    readonly origin: Vec3;
  };
  readonly sockets: readonly AssetSocket[];
  readonly colliders: readonly AssetCollider[];
  readonly materialSlots: readonly AssetMaterialSlot[];
  readonly lodGroups: readonly AssetLodGroup[];
}
type BuildOperation = {
  readonly type: 'upsert';
  readonly object: SceneObject;
} | {
  readonly type: 'remove';
  readonly id: string;
} | {
  readonly type: 'clear';
} | {
  readonly type: 'upsert_joint';
  readonly joint: RigJoint;
} | {
  readonly type: 'remove_joint';
  readonly id: string;
} | {
  readonly type: 'clear_rig';
};
interface ObjectBuildProfile {
  readonly kind: 'object';
}
interface CharacterBuildProfile {
  readonly kind: 'character';
  readonly style: 'realistic' | 'stylized' | 'anime' | 'custom';
  readonly target: 'static' | 'game' | 'mmd' | 'vtuber' | 'interactive' | 'print' | 'custom';
  readonly unit: 'm' | 'cm' | 'mm';
  readonly height: number;
}
type GameAssetCategory = 'humanoid' | 'creature' | 'building' | 'vehicle' | 'prop' | 'vegetation' | 'terrain' | 'environment';
interface GameAssetBuildProfile {
  readonly kind: 'game-asset';
  readonly category: GameAssetCategory;
  readonly archetype: string;
  readonly style: 'realistic' | 'stylized' | 'low-poly' | 'voxel' | 'custom';
  readonly usage: 'static' | 'skeletal' | 'modular' | 'environment';
  readonly target: 'generic' | 'godot' | 'unity' | 'unreal' | 'web' | 'custom';
  readonly unit: 'm' | 'cm' | 'mm';
}
type BuildProfile = ObjectBuildProfile | CharacterBuildProfile | GameAssetBuildProfile;
interface LocalizedStepText {
  readonly title: string;
  readonly note?: string;
}
type StepTranslations = Readonly<Partial<Record<UiLocale, LocalizedStepText>>>;
interface BuildCommand {
  readonly action: 'start' | 'apply' | 'complete' | 'resume';
  readonly title: string;
  readonly note?: string;
  readonly translations?: StepTranslations;
  readonly phase: BuildPhase;
  readonly profile?: BuildProfile;
  readonly sourceBuildId?: string;
  readonly sourceStep?: number;
  readonly semantics?: AssetSemantics;
  readonly operations: readonly BuildOperation[];
}
interface BuildStep {
  readonly index: number;
  readonly title: string;
  readonly note?: string;
  readonly translations?: StepTranslations;
  readonly phase?: BuildPhase;
  readonly status: BuildStatus;
  readonly operations?: readonly BuildOperation[];
  readonly objectCount?: number;
  readonly jointCount?: number;
  readonly objects?: readonly SceneObject[];
  readonly joints?: readonly RigJoint[];
  readonly semantics?: AssetSemantics;
}
interface BuildSnapshot {
  readonly protocol: ProtocolVersion;
  readonly buildId: string;
  readonly title: string;
  readonly profile?: BuildProfile;
  readonly status: BuildStatus;
  readonly revision: number;
  readonly activeStep: number;
  readonly lineage?: {
    readonly buildId: string;
    readonly step: number;
  };
  readonly semantics?: AssetSemantics;
  readonly steps: readonly BuildStep[];
}
declare function parseBuildCommand(value: unknown): BuildCommand;
//#endregion
//#region src/store.d.ts
interface BuildStoreOptions {
  readonly createId?: () => string;
}
declare class BuildStore {
  #private;
  constructor(options?: BuildStoreOptions);
  apply(command: BuildCommand): BuildSnapshot;
  snapshot(): BuildSnapshot;
  resume(source: BuildSnapshot, sourceStep: number, command: BuildCommand): BuildSnapshot;
}
//#endregion
//#region src/plugins/governance.d.ts
declare const PLUGIN_API_VERSION: 1;
type CapabilityPluginRisk = 'read-only' | 'model-write' | 'content-write' | 'artifact-write';
interface CapabilityPluginManifest {
  readonly id: string;
  readonly version: string;
  readonly apiVersion: typeof PLUGIN_API_VERSION;
  readonly description: string;
  readonly provides: readonly string[];
  readonly requires?: readonly string[];
  readonly conflicts?: readonly string[];
  readonly ownsMutationScopes?: readonly string[];
  readonly risk: CapabilityPluginRisk;
  readonly prompt?: string;
}
interface ResolvedPluginPlan {
  readonly plugins: readonly CapabilityPluginManifest[];
  readonly capabilities: Readonly<Record<string, string>>;
  readonly mutationOwners: Readonly<Record<string, string>>;
  readonly promptSections: readonly string[];
}
declare class PluginGovernor {
  #private;
  register(manifest: CapabilityPluginManifest): void;
  resolve(requestedIds?: readonly string[]): ResolvedPluginPlan;
}
//#endregion
//#region src/plugins/builtins.d.ts
declare const BUILTIN_PLUGIN_MANIFESTS: readonly CapabilityPluginManifest[];
declare function createBuiltinPluginPlan(): ResolvedPluginPlan;
//#endregion
//#region src/scene.d.ts
interface MaterializedScene {
  readonly objects: readonly SceneObject[];
  readonly joints: readonly RigJoint[];
  readonly semantics?: AssetSemantics;
}
declare function materializeBuildScene(snapshot: BuildSnapshot, stepIndex: number): MaterializedScene;
//#endregion
//#region src/art/style.d.ts
type ArtStyleFamily = 'pixel' | 'anime' | 'custom';
type StyleAuthority = 'author' | 'shared' | 'illusion-proposal';
type ReferenceRights = 'owned' | 'licensed' | 'public-domain' | 'unknown';
interface StyleReference {
  readonly id: string;
  readonly label: string;
  readonly rights: ReferenceRights;
  readonly note?: string;
}
interface ArtStyleContract {
  readonly schema: 'dsh-illusion/style-contract@1';
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly family: ArtStyleFamily;
  readonly authority: StyleAuthority;
  readonly status: 'proposed' | 'accepted';
  readonly description: string;
  readonly visualLanguage: {
    readonly palette: readonly string[];
    readonly line: string;
    readonly shape: string;
    readonly shading: string;
    readonly texture: string;
    readonly lighting: string;
  };
  readonly invariants: readonly string[];
  readonly avoid: readonly string[];
  readonly references: readonly StyleReference[];
  readonly pixel?: {
    readonly canvas: readonly [number, number];
    readonly colorLimit: number;
    readonly pixelPerfect: boolean;
    readonly dithering: 'none' | 'ordered' | 'manual';
  };
  readonly anime?: {
    readonly lineWeight: 'thin' | 'medium' | 'varied';
    readonly celBands: number;
    readonly proportion: string;
  };
}
type ArtDeliverable = 'concept' | 'portrait' | 'sprite' | 'sprite-sheet' | 'background' | 'tile-set' | 'ui-icon' | 'texture';
type ArtPhase = 'brief' | 'style' | 'composition' | 'draft' | 'pixel-cleanup' | 'lineart' | 'color' | 'render' | 'slicing' | 'validation' | 'complete';
interface ArtProductionBrief {
  readonly deliverable: ArtDeliverable;
  readonly width: number;
  readonly height: number;
  readonly transparent: boolean;
  readonly target: 'generic' | 'godot' | 'unity' | 'unreal' | 'web' | 'print';
}
declare function parseArtStyleContract(value: unknown): ArtStyleContract;
declare function createArtProductionPlan(style: ArtStyleContract, brief: ArtProductionBrief): readonly ArtPhase[];
//#endregion
//#region src/art/protocol.d.ts
interface ArtRect {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fill: string;
}
interface ArtFrame {
  readonly id: string;
  readonly label: string;
  readonly translations?: StepTranslations;
  readonly rects: readonly ArtRect[];
  readonly objects?: readonly ArtObject[];
}
interface ArtObject {
  readonly id: string;
  readonly label: string;
  readonly role?: string;
  readonly zIndex: number;
  readonly locked: boolean;
  readonly rects: readonly ArtRect[];
}
interface ArtCommand {
  readonly action: 'start' | 'apply' | 'complete';
  readonly title: string;
  readonly note?: string;
  readonly translations?: StepTranslations;
  readonly phase: ArtPhase;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frames: readonly ArtFrame[];
}
interface ArtStep extends ArtCommand {
  readonly index: number;
  readonly status: 'building' | 'complete';
}
interface ArtSnapshot {
  readonly protocol: 1;
  readonly artId: string;
  readonly title: string;
  readonly status: 'building' | 'complete';
  readonly revision: number;
  readonly activeStep: number;
  readonly steps: readonly ArtStep[];
}
declare function parseArtCommand(value: unknown): ArtCommand;
//#endregion
//#region src/art/store.d.ts
declare class ArtStore {
  #private;
  constructor(createId?: () => string);
  apply(command: ArtCommand): ArtSnapshot;
  snapshot(): ArtSnapshot;
}
//#endregion
//#region src/index.d.ts
declare const name = "dsh-illusion";
declare const inject: string[];
declare function apply(ctx: Context): void;
//#endregion
export { type ArtDeliverable, type ArtPhase, type ArtProductionBrief, ArtStore, type ArtStyleContract, type ArtStyleFamily, type AssetCollider, type AssetLodGroup, type AssetLodLevel, type AssetMaterialSlot, type AssetSemantics, type AssetSocket, BUILTIN_PLUGIN_MANIFESTS, type BuildCommand, type BuildOperation, type BuildPhase, type BuildProfile, type BuildSnapshot, type BuildStep, BuildStore, type CapabilityPluginManifest, type CapabilityPluginRisk, type GameAssetBuildProfile, type GameAssetCategory, type LocalizedStepText, PLUGIN_API_VERSION, PluginGovernor, type ReferenceRights, type ResolvedPluginPlan, type RigJoint, type SceneObject, type StepTranslations, type StyleAuthority, type StyleReference, type UiLocale, apply, createArtProductionPlan, createBuiltinPluginPlan, inject, materializeBuildScene, name, parseArtCommand, parseArtStyleContract, parseBuildCommand };