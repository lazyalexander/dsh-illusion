export const LEGACY_PROTOCOL_VERSION = 1 as const
export const PROTOCOL_VERSION = 2 as const

export type ProtocolVersion = typeof LEGACY_PROTOCOL_VERSION | typeof PROTOCOL_VERSION
export type UiLocale = 'en' | 'zh-CN'
export type BuildStatus = 'building' | 'complete'
export type BuildPhase =
  | 'reference'
  | 'silhouette'
  | 'blockout'
  | 'structure'
  | 'anatomy'
  | 'face'
  | 'hair'
  | 'clothing'
  | 'accessories'
  | 'materials'
  | 'details'
  | 'collision'
  | 'lod'
  | 'rig'
  | 'expressions'
  | 'validation'
  | 'assembly'
  | 'complete'
export type GeometryKind =
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'torus'
  | 'capsule'
  | 'ellipsoid'
  | 'plane'
  | 'lathe'
  | 'tube'
  | 'mesh'
export type Vec2 = readonly [number, number]
export type Vec3 = readonly [number, number, number]
export type Triangle = readonly [number, number, number]

export interface SceneGeometry {
  readonly kind: GeometryKind
  readonly width?: number
  readonly height?: number
  readonly depth?: number
  readonly radius?: number
  readonly tube?: number
  readonly radii?: Vec3
  readonly profile?: readonly Vec2[]
  readonly path?: readonly Vec3[]
  readonly closed?: boolean
  readonly vertices?: readonly Vec3[]
  readonly triangles?: readonly Triangle[]
}

export interface SceneObject {
  readonly id: string
  readonly label: string
  readonly role?: string
  readonly parentId?: string
  readonly geometry: SceneGeometry
  readonly position: Vec3
  readonly rotation: Vec3
  readonly scale: Vec3
  readonly color: string
  readonly opacity: number
  readonly roughness: number
  readonly metalness: number
  readonly emissive: string
  readonly doubleSided: boolean
}

export interface RigJoint {
  readonly id: string
  readonly label: string
  readonly role: string
  readonly parentId?: string
  readonly position: Vec3
  readonly rotation: Vec3
}

export interface AssetSocket {
  readonly id: string
  readonly label: string
  readonly parentId?: string
  readonly position: Vec3
  readonly rotation: Vec3
}

export interface AssetCollider {
  readonly id: string
  readonly label: string
  readonly ownerId?: string
  readonly shape: 'box' | 'sphere' | 'capsule'
  readonly center: Vec3
  readonly size?: Vec3
  readonly radius?: number
  readonly height?: number
  readonly trigger: boolean
}

export interface AssetMaterialSlot {
  readonly id: string
  readonly label: string
  readonly objectIds: readonly string[]
}

export interface AssetLodLevel {
  readonly level: number
  readonly screenCoverage: number
  readonly objectIds: readonly string[]
}

export interface AssetLodGroup {
  readonly id: string
  readonly levels: readonly AssetLodLevel[]
}

export interface AssetSemantics {
  readonly pivot: { readonly position: Vec3; readonly rotation: Vec3 }
  readonly bounds: { readonly min: Vec3; readonly max: Vec3 }
  readonly modularGrid?: { readonly size: Vec3; readonly origin: Vec3 }
  readonly sockets: readonly AssetSocket[]
  readonly colliders: readonly AssetCollider[]
  readonly materialSlots: readonly AssetMaterialSlot[]
  readonly lodGroups: readonly AssetLodGroup[]
}

export type BuildOperation =
  | { readonly type: 'upsert'; readonly object: SceneObject }
  | { readonly type: 'remove'; readonly id: string }
  | { readonly type: 'clear' }
  | { readonly type: 'upsert_joint'; readonly joint: RigJoint }
  | { readonly type: 'remove_joint'; readonly id: string }
  | { readonly type: 'clear_rig' }

export interface ObjectBuildProfile {
  readonly kind: 'object'
}

export interface CharacterBuildProfile {
  readonly kind: 'character'
  readonly style: 'realistic' | 'stylized' | 'anime' | 'custom'
  readonly target: 'static' | 'game' | 'mmd' | 'vtuber' | 'interactive' | 'print' | 'custom'
  readonly unit: 'm' | 'cm' | 'mm'
  readonly height: number
}

export type GameAssetCategory =
  | 'humanoid'
  | 'creature'
  | 'building'
  | 'vehicle'
  | 'prop'
  | 'vegetation'
  | 'terrain'
  | 'environment'

export interface GameAssetBuildProfile {
  readonly kind: 'game-asset'
  readonly category: GameAssetCategory
  readonly archetype: string
  readonly style: 'realistic' | 'stylized' | 'low-poly' | 'voxel' | 'custom'
  readonly usage: 'static' | 'skeletal' | 'modular' | 'environment'
  readonly target: 'generic' | 'godot' | 'unity' | 'unreal' | 'web' | 'custom'
  readonly unit: 'm' | 'cm' | 'mm'
}

export type BuildProfile = ObjectBuildProfile | CharacterBuildProfile | GameAssetBuildProfile

export interface LocalizedStepText {
  readonly title: string
  readonly note?: string
}

export type StepTranslations = Readonly<Partial<Record<UiLocale, LocalizedStepText>>>

export interface BuildCommand {
  readonly action: 'start' | 'apply' | 'complete' | 'resume'
  readonly title: string
  readonly note?: string
  readonly translations?: StepTranslations
  readonly phase: BuildPhase
  readonly profile?: BuildProfile
  readonly sourceBuildId?: string
  readonly sourceStep?: number
  readonly semantics?: AssetSemantics
  readonly operations: readonly BuildOperation[]
}

export interface BuildStep {
  readonly index: number
  readonly title: string
  readonly note?: string
  readonly translations?: StepTranslations
  readonly phase?: BuildPhase
  readonly status: BuildStatus
  readonly operations?: readonly BuildOperation[]
  readonly objectCount?: number
  readonly jointCount?: number
  readonly objects?: readonly SceneObject[]
  readonly joints?: readonly RigJoint[]
  readonly semantics?: AssetSemantics
}

export interface BuildSnapshot {
  readonly protocol: ProtocolVersion
  readonly buildId: string
  readonly title: string
  readonly profile?: BuildProfile
  readonly status: BuildStatus
  readonly revision: number
  readonly activeStep: number
  readonly lineage?: {
    readonly buildId: string
    readonly step: number
  }
  readonly semantics?: AssetSemantics
  readonly steps: readonly BuildStep[]
}

const LIMITS = {
  operations: 64,
  objects: 256,
  joints: 256,
  steps: 96,
  text: 160,
  lathePoints: 64,
  pathPoints: 64,
  meshVerticesPerObject: 2_048,
  meshTrianglesPerObject: 4_096,
  meshVerticesPerCommand: 8_192,
} as const

const BUILD_PHASES = [
  'reference',
  'silhouette',
  'blockout',
  'structure',
  'anatomy',
  'face',
  'hair',
  'clothing',
  'accessories',
  'materials',
  'details',
  'collision',
  'lod',
  'rig',
  'expressions',
  'validation',
  'assembly',
  'complete',
] as const

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

function text(value: unknown, label: string, fallback?: string): string {
  if (value === undefined && fallback !== undefined) return fallback
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty string`)
  }
  const normalized = value.trim()
  if (normalized.length > LIMITS.text) throw new RangeError(`${label} is too long`)
  return normalized
}

function optionalText(value: unknown, label: string): string | undefined {
  return value === undefined ? undefined : text(value, label)
}

function finite(value: unknown, label: string, fallback: number): number {
  if (value === undefined) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number`)
  }
  return value
}

function positive(value: unknown, label: string, fallback: number): number {
  const parsed = finite(value, label, fallback)
  if (parsed <= 0 || parsed > 100_000) throw new RangeError(`${label} must be in (0, 100000]`)
  return parsed
}

function nonNegative(value: unknown, label: string): number {
  const parsed = finite(value, label, 0)
  if (parsed < 0 || parsed > 100_000) throw new RangeError(`${label} must be in [0, 100000]`)
  return parsed
}

function unitInterval(value: unknown, label: string, fallback: number): number {
  const parsed = finite(value, label, fallback)
  if (parsed < 0 || parsed > 1) throw new RangeError(`${label} must be in [0, 1]`)
  return parsed
}

function booleanValue(value: unknown, label: string, fallback: boolean): boolean {
  if (value === undefined) return fallback
  if (typeof value !== 'boolean') throw new TypeError(`${label} must be a boolean`)
  return value
}

function vec2(value: unknown, label: string): Vec2 {
  if (!Array.isArray(value) || value.length !== 2) throw new TypeError(`${label} must contain 2 numbers`)
  return [finite(value[0], `${label}[0]`, 0), finite(value[1], `${label}[1]`, 0)]
}

function vec3(value: unknown, label: string, fallback: Vec3): Vec3 {
  if (value === undefined) return fallback
  if (!Array.isArray(value) || value.length !== 3) throw new TypeError(`${label} must contain 3 numbers`)
  return [
    finite(value[0], `${label}[0]`, 0),
    finite(value[1], `${label}[1]`, 0),
    finite(value[2], `${label}[2]`, 0),
  ]
}

function positiveVec3(value: unknown, label: string): Vec3 {
  if (!Array.isArray(value) || value.length !== 3) throw new TypeError(`${label} must contain 3 numbers`)
  return [
    positive(value[0], `${label}[0]`, 1),
    positive(value[1], `${label}[1]`, 1),
    positive(value[2], `${label}[2]`, 1),
  ]
}

function boundedArray(value: unknown, label: string, minimum: number, maximum: number): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`)
  if (value.length < minimum || value.length > maximum) {
    throw new RangeError(`${label} must contain between ${minimum} and ${maximum} items`)
  }
  return value
}

function color(value: unknown, label: string, fallback: string): string {
  const parsed = text(value, label, fallback)
  if (!/^#[0-9a-f]{6}$/i.test(parsed)) throw new TypeError(`${label} must be a six-digit hex color`)
  return parsed.toLowerCase()
}

function geometry(value: unknown): SceneGeometry {
  const input = record(value, 'object.geometry')
  const kind = input.kind
  if (typeof kind !== 'string') throw new TypeError('object.geometry.kind is not supported')

  switch (kind) {
    case 'box':
      return {
        kind,
        width: positive(input.width, 'geometry.width', 1),
        height: positive(input.height, 'geometry.height', 1),
        depth: positive(input.depth, 'geometry.depth', 1),
      }
    case 'sphere':
      return { kind, radius: positive(input.radius, 'geometry.radius', 1) }
    case 'cylinder':
    case 'cone':
    case 'capsule':
      return {
        kind,
        radius: positive(input.radius, 'geometry.radius', 1),
        height: positive(input.height, 'geometry.height', 1),
      }
    case 'torus':
      return {
        kind,
        radius: positive(input.radius, 'geometry.radius', 1),
        tube: positive(input.tube, 'geometry.tube', 0.25),
      }
    case 'ellipsoid':
      return { kind, radii: positiveVec3(input.radii, 'geometry.radii') }
    case 'plane':
      return {
        kind,
        width: positive(input.width, 'geometry.width', 1),
        height: positive(input.height, 'geometry.height', 1),
      }
    case 'lathe': {
      const points = boundedArray(input.profile, 'geometry.profile', 2, LIMITS.lathePoints)
        .map((point, index) => vec2(point, `geometry.profile[${index}]`))
        .map(([radius, z], index): Vec2 => [nonNegative(radius, `geometry.profile[${index}][0]`), z])
      return { kind, profile: points }
    }
    case 'tube': {
      const path = boundedArray(input.path, 'geometry.path', 2, LIMITS.pathPoints)
        .map((point, index) => vec3(point, `geometry.path[${index}]`, [0, 0, 0]))
      return {
        kind,
        path,
        radius: positive(input.radius, 'geometry.radius', 0.1),
        closed: booleanValue(input.closed, 'geometry.closed', false),
      }
    }
    case 'mesh': {
      const vertices = boundedArray(input.vertices, 'geometry.vertices', 3, LIMITS.meshVerticesPerObject)
        .map((point, index) => vec3(point, `geometry.vertices[${index}]`, [0, 0, 0]))
      const triangles = boundedArray(input.triangles, 'geometry.triangles', 1, LIMITS.meshTrianglesPerObject)
        .map((value, triangleIndex): Triangle => {
          if (!Array.isArray(value) || value.length !== 3) {
            throw new TypeError(`geometry.triangles[${triangleIndex}] must contain 3 indices`)
          }
          const parsed = value.map((index, corner) => {
            if (!Number.isInteger(index) || (index as number) < 0 || (index as number) >= vertices.length) {
              throw new RangeError(`geometry.triangles[${triangleIndex}][${corner}] is outside the vertex array`)
            }
            return index as number
          }) as unknown as Triangle
          if (new Set(parsed).size !== 3) throw new RangeError(`geometry.triangles[${triangleIndex}] is degenerate`)
          return parsed
        })
      return { kind, vertices, triangles }
    }
    default:
      throw new TypeError('object.geometry.kind is not supported')
  }
}

function sceneObject(value: unknown): SceneObject {
  const input = record(value, 'operation.object')
  const parentId = optionalText(input.parentId, 'object.parentId')
  const role = optionalText(input.role, 'object.role')
  return {
    id: text(input.id, 'object.id'),
    label: text(input.label, 'object.label', String(input.id ?? 'object')),
    ...(role === undefined ? {} : { role }),
    ...(parentId === undefined ? {} : { parentId }),
    geometry: geometry(input.geometry),
    position: vec3(input.position, 'object.position', [0, 0, 0]),
    rotation: vec3(input.rotation, 'object.rotation', [0, 0, 0]),
    scale: vec3(input.scale, 'object.scale', [1, 1, 1]),
    color: color(input.color, 'object.color', '#76a9ff'),
    opacity: unitInterval(input.opacity, 'object.opacity', 1),
    roughness: unitInterval(input.roughness, 'object.roughness', 0.58),
    metalness: unitInterval(input.metalness, 'object.metalness', 0.12),
    emissive: color(input.emissive, 'object.emissive', '#000000'),
    doubleSided: booleanValue(input.doubleSided, 'object.doubleSided', false),
  }
}

function rigJoint(value: unknown): RigJoint {
  const input = record(value, 'operation.joint')
  const parentId = optionalText(input.parentId, 'joint.parentId')
  return {
    id: text(input.id, 'joint.id'),
    label: text(input.label, 'joint.label', String(input.id ?? 'joint')),
    role: text(input.role, 'joint.role', 'joint'),
    ...(parentId === undefined ? {} : { parentId }),
    position: vec3(input.position, 'joint.position', [0, 0, 0]),
    rotation: vec3(input.rotation, 'joint.rotation', [0, 0, 0]),
  }
}

function uniqueIds<T extends { readonly id: string }>(items: readonly T[], label: string): void {
  const ids = new Set<string>()
  for (const item of items) {
    if (ids.has(item.id)) throw new RangeError(`${label} contains duplicate id “${item.id}”`)
    ids.add(item.id)
  }
}

function stringArray(value: unknown, label: string): readonly string[] {
  return boundedArray(value, label, 1, LIMITS.objects).map((item, index) => text(item, `${label}[${index}]`))
}

function assetSemantics(value: unknown): AssetSemantics {
  const input = record(value, 'semantics')
  const pivotInput = record(input.pivot, 'semantics.pivot')
  const boundsInput = record(input.bounds, 'semantics.bounds')
  const min = vec3(boundsInput.min, 'semantics.bounds.min', [0, 0, 0])
  const max = vec3(boundsInput.max, 'semantics.bounds.max', [0, 0, 0])
  if (min.some((item, index) => item >= max[index]!)) throw new RangeError('semantics.bounds.min must be below max on every axis')

  const sockets = (input.sockets === undefined ? [] : boundedArray(input.sockets, 'semantics.sockets', 0, 128)).map((value, index): AssetSocket => {
    const item = record(value, `semantics.sockets[${index}]`)
    const parentId = optionalText(item.parentId, `semantics.sockets[${index}].parentId`)
    return {
      id: text(item.id, `semantics.sockets[${index}].id`),
      label: text(item.label, `semantics.sockets[${index}].label`, String(item.id ?? 'socket')),
      ...(parentId === undefined ? {} : { parentId }),
      position: vec3(item.position, `semantics.sockets[${index}].position`, [0, 0, 0]),
      rotation: vec3(item.rotation, `semantics.sockets[${index}].rotation`, [0, 0, 0]),
    }
  })
  uniqueIds(sockets, 'semantics.sockets')

  const colliders = (input.colliders === undefined ? [] : boundedArray(input.colliders, 'semantics.colliders', 0, 128)).map((value, index): AssetCollider => {
    const item = record(value, `semantics.colliders[${index}]`)
    if (item.shape !== 'box' && item.shape !== 'sphere' && item.shape !== 'capsule') {
      throw new TypeError(`semantics.colliders[${index}].shape is not supported`)
    }
    const ownerId = optionalText(item.ownerId, `semantics.colliders[${index}].ownerId`)
    return {
      id: text(item.id, `semantics.colliders[${index}].id`),
      label: text(item.label, `semantics.colliders[${index}].label`, String(item.id ?? 'collider')),
      ...(ownerId === undefined ? {} : { ownerId }),
      shape: item.shape,
      center: vec3(item.center, `semantics.colliders[${index}].center`, [0, 0, 0]),
      ...(item.shape === 'box' ? { size: positiveVec3(item.size, `semantics.colliders[${index}].size`) } : {}),
      ...(item.shape === 'sphere' || item.shape === 'capsule' ? { radius: positive(item.radius, `semantics.colliders[${index}].radius`, 0.5) } : {}),
      ...(item.shape === 'capsule' ? { height: positive(item.height, `semantics.colliders[${index}].height`, 1) } : {}),
      trigger: booleanValue(item.trigger, `semantics.colliders[${index}].trigger`, false),
    }
  })
  uniqueIds(colliders, 'semantics.colliders')

  const materialSlots = (input.materialSlots === undefined ? [] : boundedArray(input.materialSlots, 'semantics.materialSlots', 0, 64)).map((value, index): AssetMaterialSlot => {
    const item = record(value, `semantics.materialSlots[${index}]`)
    return {
      id: text(item.id, `semantics.materialSlots[${index}].id`),
      label: text(item.label, `semantics.materialSlots[${index}].label`, String(item.id ?? 'material')),
      objectIds: stringArray(item.objectIds, `semantics.materialSlots[${index}].objectIds`),
    }
  })
  uniqueIds(materialSlots, 'semantics.materialSlots')

  const lodGroups = (input.lodGroups === undefined ? [] : boundedArray(input.lodGroups, 'semantics.lodGroups', 0, 32)).map((value, index): AssetLodGroup => {
    const item = record(value, `semantics.lodGroups[${index}]`)
    const levels = boundedArray(item.levels, `semantics.lodGroups[${index}].levels`, 1, 8).map((value, levelIndex): AssetLodLevel => {
      const level = record(value, `semantics.lodGroups[${index}].levels[${levelIndex}]`)
      const parsedLevel = finite(level.level, `semantics.lodGroups[${index}].levels[${levelIndex}].level`, levelIndex)
      if (!Number.isInteger(parsedLevel) || parsedLevel < 0) throw new RangeError('LOD level must be a non-negative integer')
      return {
        level: parsedLevel,
        screenCoverage: unitInterval(level.screenCoverage, `semantics.lodGroups[${index}].levels[${levelIndex}].screenCoverage`, 1),
        objectIds: stringArray(level.objectIds, `semantics.lodGroups[${index}].levels[${levelIndex}].objectIds`),
      }
    })
    if (new Set(levels.map((level) => level.level)).size !== levels.length) throw new RangeError('LOD levels must be unique within a group')
    return { id: text(item.id, `semantics.lodGroups[${index}].id`), levels }
  })
  uniqueIds(lodGroups, 'semantics.lodGroups')

  let modularGrid: AssetSemantics['modularGrid']
  if (input.modularGrid !== undefined) {
    const grid = record(input.modularGrid, 'semantics.modularGrid')
    modularGrid = {
      size: positiveVec3(grid.size, 'semantics.modularGrid.size'),
      origin: vec3(grid.origin, 'semantics.modularGrid.origin', [0, 0, 0]),
    }
  }
  return {
    pivot: {
      position: vec3(pivotInput.position, 'semantics.pivot.position', [0, 0, 0]),
      rotation: vec3(pivotInput.rotation, 'semantics.pivot.rotation', [0, 0, 0]),
    },
    bounds: { min, max },
    ...(modularGrid === undefined ? {} : { modularGrid }),
    sockets,
    colliders,
    materialSlots,
    lodGroups,
  }
}

function operation(value: unknown): BuildOperation {
  const input = record(value, 'operation')
  if (input.type === 'clear') return { type: 'clear' }
  if (input.type === 'clear_rig') return { type: 'clear_rig' }
  if (input.type === 'remove') return { type: 'remove', id: text(input.id, 'operation.id') }
  if (input.type === 'remove_joint') return { type: 'remove_joint', id: text(input.id, 'operation.id') }
  if (input.type === 'upsert') return { type: 'upsert', object: sceneObject(input.object) }
  if (input.type === 'upsert_joint') return { type: 'upsert_joint', joint: rigJoint(input.joint) }
  throw new TypeError('operation.type must be upsert, remove, clear, upsert_joint, remove_joint, or clear_rig')
}

function profile(value: unknown): BuildProfile {
  const input = record(value, 'profile')
  if (input.kind === 'object') return { kind: 'object' }
  if (input.kind === 'game-asset') {
    const categories = ['humanoid', 'creature', 'building', 'vehicle', 'prop', 'vegetation', 'terrain', 'environment'] as const
    const styles = ['realistic', 'stylized', 'low-poly', 'voxel', 'custom'] as const
    const usages = ['static', 'skeletal', 'modular', 'environment'] as const
    const targets = ['generic', 'godot', 'unity', 'unreal', 'web', 'custom'] as const
    const units = ['m', 'cm', 'mm'] as const
    const category = input.category ?? 'prop'
    const style = input.style ?? 'stylized'
    const usage = input.usage ?? (category === 'humanoid' || category === 'creature' ? 'skeletal' : 'static')
    const target = input.target ?? 'generic'
    const unit = input.unit ?? 'm'
    if (!categories.includes(category as typeof categories[number])) throw new TypeError('profile.category is not supported')
    if (!styles.includes(style as typeof styles[number])) throw new TypeError('profile.style is not supported')
    if (!usages.includes(usage as typeof usages[number])) throw new TypeError('profile.usage is not supported')
    if (!targets.includes(target as typeof targets[number])) throw new TypeError('profile.target is not supported')
    if (!units.includes(unit as typeof units[number])) throw new TypeError('profile.unit is not supported')
    return {
      kind: 'game-asset',
      category: category as GameAssetBuildProfile['category'],
      archetype: text(input.archetype, 'profile.archetype', 'generic'),
      style: style as GameAssetBuildProfile['style'],
      usage: usage as GameAssetBuildProfile['usage'],
      target: target as GameAssetBuildProfile['target'],
      unit: unit as GameAssetBuildProfile['unit'],
    }
  }
  if (input.kind !== 'character') throw new TypeError('profile.kind must be object, character, or game-asset')
  const styles = ['realistic', 'stylized', 'anime', 'custom'] as const
  const targets = ['static', 'game', 'mmd', 'vtuber', 'interactive', 'print', 'custom'] as const
  const units = ['m', 'cm', 'mm'] as const
  const style = input.style ?? 'stylized'
  const target = input.target ?? 'static'
  const unit = input.unit ?? 'm'
  if (!styles.includes(style as typeof styles[number])) throw new TypeError('profile.style is not supported')
  if (!targets.includes(target as typeof targets[number])) throw new TypeError('profile.target is not supported')
  if (!units.includes(unit as typeof units[number])) throw new TypeError('profile.unit is not supported')
  return {
    kind: 'character',
    style: style as CharacterBuildProfile['style'],
    target: target as CharacterBuildProfile['target'],
    unit: unit as CharacterBuildProfile['unit'],
    height: positive(input.height, 'profile.height', 1.7),
  }
}

function phase(value: unknown, action: BuildCommand['action']): BuildPhase {
  const fallback: BuildPhase = action === 'complete' ? 'complete' : 'assembly'
  if (value === undefined) return fallback
  if (!BUILD_PHASES.includes(value as BuildPhase)) throw new TypeError('phase is not supported')
  return value as BuildPhase
}

function translations(value: unknown): StepTranslations | undefined {
  if (value === undefined) return undefined
  const input = record(value, 'translations')
  const result: Partial<Record<UiLocale, LocalizedStepText>> = {}
  for (const locale of ['en', 'zh-CN'] as const) {
    if (input[locale] === undefined) continue
    const localized = record(input[locale], `translations.${locale}`)
    const note = optionalText(localized.note, `translations.${locale}.note`)
    result[locale] = {
      title: text(localized.title, `translations.${locale}.title`),
      ...(note === undefined ? {} : { note }),
    }
  }
  if (Object.keys(result).length === 0) {
    throw new RangeError('translations must contain en or zh-CN')
  }
  return result
}

export function parseBuildCommand(value: unknown): BuildCommand {
  const input = record(value, 'arguments')
  if (input.action !== 'start' && input.action !== 'apply' && input.action !== 'complete' && input.action !== 'resume') {
    throw new TypeError('action must be start, apply, complete, or resume')
  }
  if (input.profile !== undefined && input.action !== 'start') {
    throw new TypeError('profile may only be set when action is start')
  }
  const rawOperations = input.operations ?? []
  if (!Array.isArray(rawOperations)) throw new TypeError('operations must be an array')
  if (rawOperations.length > LIMITS.operations) throw new RangeError(`operations may contain at most ${LIMITS.operations} items`)
  const operations = rawOperations.map(operation)
  if (input.action === 'apply' && operations.length === 0 && input.semantics === undefined) {
    throw new RangeError('apply requires at least one operation or game semantics')
  }
  if (input.action === 'resume' && operations.length !== 0) {
    throw new RangeError('resume does not accept operations')
  }
  if (input.action === 'resume' && input.semantics !== undefined) {
    throw new RangeError('resume does not accept game semantics')
  }
  if (input.action === 'resume' && (typeof input.sourceBuildId !== 'string' || input.sourceBuildId.trim().length === 0)) {
    throw new TypeError('resume requires sourceBuildId')
  }
  if (input.action !== 'resume' && (input.sourceBuildId !== undefined || input.sourceStep !== undefined)) {
    throw new TypeError('sourceBuildId and sourceStep may only be set when action is resume')
  }
  const sourceStep = input.sourceStep === undefined ? undefined : finite(input.sourceStep, 'sourceStep', 0)
  if (input.action === 'resume' && (sourceStep === undefined || !Number.isInteger(sourceStep) || sourceStep < 1)) {
    throw new RangeError('resume requires sourceStep as a positive integer')
  }
  const meshVertexCount = operations.reduce((total, item) => (
    item.type === 'upsert' && item.object.geometry.kind === 'mesh'
      ? total + (item.object.geometry.vertices?.length ?? 0)
      : total
  ), 0)
  if (meshVertexCount > LIMITS.meshVerticesPerCommand) {
    throw new RangeError(`a command may contain at most ${LIMITS.meshVerticesPerCommand} custom-mesh vertices`)
  }
  const parsedProfile = input.profile === undefined ? undefined : profile(input.profile)
  const parsedTranslations = translations(input.translations)
  const parsedSemantics = input.semantics === undefined ? undefined : assetSemantics(input.semantics)
  return {
    action: input.action,
    title: text(input.title, 'title'),
    ...(input.note === undefined ? {} : { note: text(input.note, 'note') }),
    ...(parsedTranslations === undefined ? {} : { translations: parsedTranslations }),
    phase: phase(input.phase, input.action),
    ...(parsedProfile === undefined ? {} : { profile: parsedProfile }),
    ...(input.action === 'resume' ? {
      sourceBuildId: text(input.sourceBuildId, 'sourceBuildId'),
      sourceStep: sourceStep as number,
    } : {}),
    ...(parsedSemantics === undefined ? {} : { semantics: parsedSemantics }),
    operations,
  }
}

export const BUILD_LIMITS = LIMITS
export const BUILD_PHASE_VALUES: readonly BuildPhase[] = BUILD_PHASES
