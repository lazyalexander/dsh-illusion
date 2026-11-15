import type {
  AssetSemantics,
  BuildOperation,
  BuildSnapshot,
  RigJoint,
  SceneGeometry,
  SceneObject,
} from './protocol.js'

export interface MaterializedScene {
  readonly objects: readonly SceneObject[]
  readonly joints: readonly RigJoint[]
  readonly semantics?: AssetSemantics
}

export function cloneAssetSemantics(semantics: AssetSemantics): AssetSemantics {
  return structuredClone(semantics)
}

export function validateAssetSemantics(semantics: AssetSemantics, objects: ReadonlyMap<string, SceneObject>): void {
  const requireObject = (id: string, label: string): void => {
    if (!objects.has(id)) throw new RangeError(`${label} references missing object “${id}”`)
  }
  for (const socket of semantics.sockets) {
    if (socket.parentId !== undefined) requireObject(socket.parentId, `socket “${socket.id}”`)
  }
  for (const collider of semantics.colliders) {
    if (collider.ownerId !== undefined) requireObject(collider.ownerId, `collider “${collider.id}”`)
  }
  const slottedObjects = new Set<string>()
  for (const slot of semantics.materialSlots) {
    for (const id of slot.objectIds) {
      requireObject(id, `material slot “${slot.id}”`)
      if (slottedObjects.has(id)) throw new RangeError(`object “${id}” belongs to more than one material slot`)
      slottedObjects.add(id)
    }
  }
  for (const group of semantics.lodGroups) {
    let previousCoverage = Number.POSITIVE_INFINITY
    const members = new Set<string>()
    for (const level of [...group.levels].sort((left, right) => left.level - right.level)) {
      if (level.screenCoverage >= previousCoverage) {
        throw new RangeError(`LOD group “${group.id}” screen coverage must decrease by level`)
      }
      previousCoverage = level.screenCoverage
      for (const id of level.objectIds) {
        requireObject(id, `LOD group “${group.id}”`)
        if (members.has(id)) throw new RangeError(`object “${id}” appears in more than one level of LOD group “${group.id}”`)
        members.add(id)
      }
    }
  }
}

export function cloneGeometry(geometry: SceneGeometry): SceneGeometry {
  return {
    ...geometry,
    ...(geometry.radii === undefined ? {} : { radii: [...geometry.radii] }),
    ...(geometry.profile === undefined ? {} : {
      profile: geometry.profile.map((point) => [...point]),
    }),
    ...(geometry.path === undefined ? {} : {
      path: geometry.path.map((point) => [...point]),
    }),
    ...(geometry.vertices === undefined ? {} : {
      vertices: geometry.vertices.map((point) => [...point]),
    }),
    ...(geometry.triangles === undefined ? {} : {
      triangles: geometry.triangles.map((triangle) => [...triangle]),
    }),
  }
}

export function cloneSceneObject(object: SceneObject): SceneObject {
  return {
    ...object,
    geometry: cloneGeometry(object.geometry),
    position: [...object.position],
    rotation: [...object.rotation],
    scale: [...object.scale],
  }
}

export function cloneRigJoint(joint: RigJoint): RigJoint {
  return {
    ...joint,
    position: [...joint.position],
    rotation: [...joint.rotation],
  }
}

export function cloneOperation(operation: BuildOperation): BuildOperation {
  if (operation.type === 'upsert') return { type: 'upsert', object: cloneSceneObject(operation.object) }
  if (operation.type === 'upsert_joint') return { type: 'upsert_joint', joint: cloneRigJoint(operation.joint) }
  if (operation.type === 'remove' || operation.type === 'remove_joint') {
    return { type: operation.type, id: operation.id }
  }
  return { type: operation.type }
}

export function applyOperations(
  objects: Map<string, SceneObject>,
  joints: Map<string, RigJoint>,
  operations: readonly BuildOperation[],
): void {
  for (const operation of operations) {
    if (operation.type === 'clear') objects.clear()
    if (operation.type === 'clear_rig') joints.clear()
    if (operation.type === 'remove') objects.delete(operation.id)
    if (operation.type === 'remove_joint') joints.delete(operation.id)
    if (operation.type === 'upsert') objects.set(operation.object.id, cloneSceneObject(operation.object))
    if (operation.type === 'upsert_joint') joints.set(operation.joint.id, cloneRigJoint(operation.joint))
  }
}

export function validateHierarchy(
  nodes: ReadonlyMap<string, { readonly id: string; readonly parentId?: string }>,
  label: string,
): void {
  for (const node of nodes.values()) {
    if (node.parentId !== undefined && !nodes.has(node.parentId)) {
      throw new RangeError(`${label} “${node.id}” references missing parent “${node.parentId}”`)
    }
    const visited = new Set<string>([node.id])
    let parentId = node.parentId
    while (parentId !== undefined) {
      if (visited.has(parentId)) throw new RangeError(`${label} hierarchy contains a cycle at “${parentId}”`)
      visited.add(parentId)
      parentId = nodes.get(parentId)?.parentId
    }
  }
}

export function materializeBuildScene(snapshot: BuildSnapshot, stepIndex: number): MaterializedScene {
  const objects = new Map<string, SceneObject>()
  const joints = new Map<string, RigJoint>()
  const last = Math.min(Math.max(stepIndex, 0), snapshot.steps.length - 1)
  let semantics: AssetSemantics | undefined

  for (let index = 0; index <= last; index += 1) {
    const step = snapshot.steps[index]
    if (step === undefined) continue
    const hasMaterializedState = step.objects !== undefined || step.joints !== undefined
    if (step.objects !== undefined) {
      objects.clear()
      for (const object of step.objects) objects.set(object.id, cloneSceneObject(object))
    }
    if (step.joints !== undefined) {
      joints.clear()
      for (const joint of step.joints) joints.set(joint.id, cloneRigJoint(joint))
    }
    if (!hasMaterializedState && step.operations !== undefined) {
      applyOperations(objects, joints, step.operations)
    }
    if (step.semantics !== undefined) semantics = cloneAssetSemantics(step.semantics)
  }

  return {
    objects: [...objects.values()].map(cloneSceneObject),
    joints: [...joints.values()].map(cloneRigJoint),
    ...(semantics === undefined ? {} : { semantics }),
  }
}
