import {
  BUILD_LIMITS,
  PROTOCOL_VERSION,
  type BuildCommand,
  type BuildProfile,
  type BuildSnapshot,
  type BuildStatus,
  type BuildStep,
  type AssetSemantics,
  type RigJoint,
  type SceneObject,
} from './protocol.js'
import {
  applyOperations,
  cloneAssetSemantics,
  cloneOperation,
  cloneRigJoint,
  cloneSceneObject,
  materializeBuildScene,
  validateHierarchy,
  validateAssetSemantics,
} from './scene.js'

export interface BuildStoreOptions {
  readonly createId?: () => string
}

export class BuildStore {
  readonly #createId: () => string
  #buildId = ''
  #title = ''
  #profile: BuildProfile = { kind: 'object' }
  #status: BuildStatus = 'building'
  #revision = 0
  #lineage: BuildSnapshot['lineage']
  #steps: BuildStep[] = []
  #objects = new Map<string, SceneObject>()
  #joints = new Map<string, RigJoint>()
  #semantics: AssetSemantics | undefined

  constructor(options: BuildStoreOptions = {}) {
    this.#createId = options.createId ?? (() => `illusion-${Date.now().toString(36)}`)
  }

  apply(command: BuildCommand): BuildSnapshot {
    if (command.action === 'resume') {
      throw new Error('resume requires a source snapshot')
    }
    if (command.action === 'start' || this.#buildId.length === 0) {
      this.#reset(command.title, command.profile ?? { kind: 'object' })
    }
    if (this.#status === 'complete' && command.action === 'complete') {
      throw new Error('build is already complete; apply a revision before completing it again')
    }

    const nextObjects = new Map([...this.#objects].map(([id, object]) => [id, cloneSceneObject(object)]))
    const nextJoints = new Map([...this.#joints].map(([id, joint]) => [id, cloneRigJoint(joint)]))
    applyOperations(nextObjects, nextJoints, command.operations)
    if (nextObjects.size > BUILD_LIMITS.objects) {
      throw new RangeError(`a build may contain at most ${BUILD_LIMITS.objects} objects`)
    }
    if (nextJoints.size > BUILD_LIMITS.joints) {
      throw new RangeError(`a build may contain at most ${BUILD_LIMITS.joints} joints`)
    }
    validateHierarchy(nextObjects, 'object')
    validateHierarchy(nextJoints, 'joint')
    const nextSemantics = command.semantics === undefined
      ? this.#semantics
      : cloneAssetSemantics(command.semantics)
    if (nextSemantics !== undefined && this.#profile.kind !== 'game-asset') {
      throw new TypeError('game semantics require a game-asset build profile')
    }
    if (nextSemantics !== undefined) validateAssetSemantics(nextSemantics, nextObjects)

    this.#objects = nextObjects
    this.#joints = nextJoints
    this.#semantics = nextSemantics
    this.#revision += 1
    this.#title = command.action === 'start' ? command.title : this.#title
    this.#status = command.action === 'complete' ? 'complete' : 'building'
    const step: BuildStep = {
      index: this.#revision,
      title: command.title,
      ...(command.note === undefined ? {} : { note: command.note }),
      ...(command.translations === undefined ? {} : { translations: structuredClone(command.translations) }),
      phase: command.phase,
      status: this.#status,
      operations: command.operations.map(cloneOperation),
      objectCount: this.#objects.size,
      jointCount: this.#joints.size,
      ...(command.semantics === undefined ? {} : { semantics: cloneAssetSemantics(command.semantics) }),
    }
    this.#steps.push(step)
    if (this.#steps.length > BUILD_LIMITS.steps) this.#compactHistory()
    return this.snapshot()
  }

  snapshot(): BuildSnapshot {
    return {
      protocol: PROTOCOL_VERSION,
      buildId: this.#buildId,
      title: this.#title,
      profile: { ...this.#profile },
      status: this.#status,
      revision: this.#revision,
      activeStep: Math.max(0, this.#steps.length - 1),
      ...(this.#lineage === undefined ? {} : { lineage: { ...this.#lineage } }),
      ...(this.#semantics === undefined ? {} : { semantics: cloneAssetSemantics(this.#semantics) }),
      steps: this.#steps.map((step) => ({
        ...step,
        ...(step.translations === undefined ? {} : { translations: structuredClone(step.translations) }),
        ...(step.operations === undefined ? {} : { operations: step.operations.map(cloneOperation) }),
        ...(step.semantics === undefined ? {} : { semantics: cloneAssetSemantics(step.semantics) }),
      })),
    }
  }

  resume(source: BuildSnapshot, sourceStep: number, command: BuildCommand): BuildSnapshot {
    if (command.action !== 'resume') throw new TypeError('resume requires a resume command')
    const stepIndex = source.steps.findIndex((step) => step.index === sourceStep)
    if (stepIndex < 0) throw new RangeError(`source step ${sourceStep} is not available`)
    const scene = materializeBuildScene(source, stepIndex)
    this.#reset(command.title, source.profile ?? { kind: 'object' })
    this.#lineage = { buildId: source.buildId, step: sourceStep }
    this.#objects = new Map(scene.objects.map((object) => [object.id, cloneSceneObject(object)]))
    this.#joints = new Map(scene.joints.map((joint) => [joint.id, cloneRigJoint(joint)]))
    this.#semantics = scene.semantics === undefined ? undefined : cloneAssetSemantics(scene.semantics)
    this.#revision = 1
    this.#steps = [{
      index: 1,
      title: command.title,
      ...(command.note === undefined ? {} : { note: command.note }),
      ...(command.translations === undefined ? {} : { translations: structuredClone(command.translations) }),
      phase: command.phase,
      status: 'building',
      objectCount: scene.objects.length,
      jointCount: scene.joints.length,
      objects: scene.objects.map(cloneSceneObject),
      joints: scene.joints.map(cloneRigJoint),
      ...(scene.semantics === undefined ? {} : { semantics: cloneAssetSemantics(scene.semantics) }),
    }]
    return this.snapshot()
  }

  #reset(title: string, profile: BuildProfile): void {
    this.#buildId = this.#createId()
    this.#title = title
    this.#profile = { ...profile }
    this.#status = 'building'
    this.#revision = 0
    this.#lineage = undefined
    this.#steps = []
    this.#objects.clear()
    this.#joints.clear()
    this.#semantics = undefined
  }

  #compactHistory(): void {
    const firstRetained = this.#steps[1]
    if (firstRetained === undefined) return
    const scene = materializeBuildScene({
      protocol: PROTOCOL_VERSION,
      buildId: this.#buildId,
      title: this.#title,
      profile: { ...this.#profile },
      status: this.#status,
      revision: this.#revision,
      activeStep: 1,
      steps: this.#steps,
    }, 1)
    const checkpoint: BuildStep = {
      index: firstRetained.index,
      title: firstRetained.title,
      ...(firstRetained.note === undefined ? {} : { note: firstRetained.note }),
      ...(firstRetained.translations === undefined ? {} : { translations: structuredClone(firstRetained.translations) }),
      ...(firstRetained.phase === undefined ? {} : { phase: firstRetained.phase }),
      status: firstRetained.status,
      objectCount: scene.objects.length,
      jointCount: scene.joints.length,
      objects: scene.objects,
      joints: scene.joints,
      ...(scene.semantics === undefined ? {} : { semantics: cloneAssetSemantics(scene.semantics) }),
    }
    this.#steps = [checkpoint, ...this.#steps.slice(2)]
  }
}
