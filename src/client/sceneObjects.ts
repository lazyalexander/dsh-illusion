import * as THREE from 'three'

import type { RigJoint, SceneObject, Vec3 } from '../protocol.js'
import { applyProtocolPose, applyProtocolTransform } from './coordinates.js'

export interface SceneGroupOptions {
  readonly includeEdges?: boolean
  readonly joints?: readonly RigJoint[]
  readonly showRig?: boolean
}

function viewerPoint(point: Vec3): THREE.Vector3 {
  return new THREE.Vector3(point[0], point[2], point[1])
}

function customMeshGeometry(object: SceneObject): THREE.BufferGeometry {
  const vertices = object.geometry.vertices ?? []
  const triangles = object.geometry.triangles ?? []
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(
    vertices.flatMap((point) => [point[0], point[2], point[1]]),
    3,
  ))
  geometry.setIndex(triangles.flatMap(([a, b, c]) => [a, c, b]))
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function geometryFor(object: SceneObject): THREE.BufferGeometry {
  const shape = object.geometry
  switch (shape.kind) {
    case 'box':
      return new THREE.BoxGeometry(shape.width ?? 1, shape.height ?? 1, shape.depth ?? 1)
    case 'sphere':
      return new THREE.SphereGeometry(shape.radius ?? 1, 40, 24)
    case 'cylinder':
      return new THREE.CylinderGeometry(shape.radius ?? 1, shape.radius ?? 1, shape.height ?? 1, 40)
    case 'cone':
      return new THREE.ConeGeometry(shape.radius ?? 1, shape.height ?? 1, 40)
    case 'torus': {
      const geometry = new THREE.TorusGeometry(shape.radius ?? 1, shape.tube ?? 0.25, 20, 64)
      geometry.rotateX(Math.PI / 2)
      return geometry
    }
    case 'capsule':
      return new THREE.CapsuleGeometry(shape.radius ?? 1, shape.height ?? 1, 10, 24)
    case 'ellipsoid': {
      const [x, y, z] = shape.radii ?? [1, 1, 1]
      const geometry = new THREE.SphereGeometry(1, 48, 28)
      geometry.scale(x, z, y)
      return geometry
    }
    case 'plane':
      return new THREE.PlaneGeometry(shape.width ?? 1, shape.height ?? 1, 1, 1)
    case 'lathe':
      return new THREE.LatheGeometry(
        (shape.profile ?? [[0, 0], [1, 1]]).map(([radius, z]) => new THREE.Vector2(radius, z)),
        48,
      )
    case 'tube': {
      const points = (shape.path ?? [[0, 0, 0], [0, 0, 1]]).map(viewerPoint)
      const curve = new THREE.CatmullRomCurve3(points, shape.closed ?? false, 'centripetal')
      return new THREE.TubeGeometry(
        curve,
        Math.max(16, points.length * 8),
        shape.radius ?? 0.1,
        12,
        shape.closed ?? false,
      )
    }
    case 'mesh':
      return customMeshGeometry(object)
  }
}

export function createSceneObjectMesh(object: SceneObject): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({
    color: object.color,
    emissive: object.emissive ?? '#000000',
    metalness: object.metalness ?? 0.12,
    roughness: object.roughness ?? 0.58,
    transparent: object.opacity < 1,
    opacity: object.opacity,
    side: object.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
  })
  const mesh = new THREE.Mesh(geometryFor(object), material)
  mesh.name = object.label
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData = {
    illusionId: object.id,
    ...(object.role === undefined ? {} : { illusionRole: object.role }),
    ...(object.parentId === undefined ? {} : { illusionParentId: object.parentId }),
    protocolPosition: [...object.position],
    protocolRotationDegrees: [...object.rotation],
    protocolScale: [...object.scale],
  }
  applyProtocolTransform(mesh, object)
  return mesh
}

function createRigGroup(joints: readonly RigJoint[], showRig: boolean): THREE.Group {
  const group = new THREE.Group()
  group.name = 'Illusion rig'
  group.userData = { illusionRig: true, illusionJointCount: joints.length }
  const bones = new Map<string, THREE.Bone>()

  for (const joint of joints) {
    const bone = new THREE.Bone()
    bone.name = joint.label
    bone.userData = {
      illusionJointId: joint.id,
      illusionJointRole: joint.role,
      ...(joint.parentId === undefined ? {} : { illusionParentJointId: joint.parentId }),
      protocolPosition: [...joint.position],
      protocolRotationDegrees: [...joint.rotation],
    }
    applyProtocolPose(bone, joint.position, joint.rotation)
    bones.set(joint.id, bone)
  }
  for (const joint of joints) {
    const bone = bones.get(joint.id)
    if (bone === undefined) continue
    const parent = joint.parentId === undefined ? undefined : bones.get(joint.parentId)
    ;(parent ?? group).add(bone)
  }

  if (!showRig || joints.length === 0) return group
  group.updateMatrixWorld(true)
  const points = new Map<string, THREE.Vector3>()
  for (const joint of joints) {
    const bone = bones.get(joint.id)
    if (bone !== undefined) points.set(joint.id, bone.getWorldPosition(new THREE.Vector3()))
  }
  const segments: number[] = []
  for (const joint of joints) {
    if (joint.parentId === undefined) continue
    const parent = points.get(joint.parentId)
    const child = points.get(joint.id)
    if (parent !== undefined && child !== undefined) segments.push(...parent.toArray(), ...child.toArray())
  }
  if (segments.length > 0) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3))
    const lines = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: 0x7ce7ff, transparent: true, opacity: 0.9 }),
    )
    lines.name = 'Rig preview'
    lines.userData = { illusionPreviewOnly: true }
    group.add(lines)
  }

  const pointValues = [...points.values()]
  const bounds = new THREE.Box3().setFromPoints(pointValues)
  const span = bounds.isEmpty() ? 1 : Math.max(...bounds.getSize(new THREE.Vector3()).toArray(), 1)
  const markers = new THREE.InstancedMesh(
    new THREE.SphereGeometry(span * 0.008, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xa8f2ff }),
    pointValues.length,
  )
  markers.name = 'Joint markers'
  markers.userData = { illusionPreviewOnly: true }
  pointValues.forEach((point, index) => {
    markers.setMatrixAt(index, new THREE.Matrix4().makeTranslation(point.x, point.y, point.z))
  })
  markers.instanceMatrix.needsUpdate = true
  group.add(markers)
  return group
}

export function createSceneObjectGroup(
  objects: readonly SceneObject[],
  options: SceneGroupOptions | boolean = {},
): THREE.Group {
  const normalized = typeof options === 'boolean' ? { includeEdges: options } : options
  const group = new THREE.Group()
  group.name = 'Illusion preview scene'
  const meshes = new Map<string, THREE.Mesh>()

  for (const object of objects) {
    const mesh = createSceneObjectMesh(object)
    meshes.set(object.id, mesh)
    if (normalized.includeEdges === true) {
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry, 28),
        new THREE.LineBasicMaterial({ color: 0x0c1320, transparent: true, opacity: 0.36 }),
      )
      edges.userData = { illusionPreviewOnly: true }
      mesh.add(edges)
    }
  }
  for (const object of objects) {
    const mesh = meshes.get(object.id)
    if (mesh === undefined) continue
    const parent = object.parentId === undefined ? undefined : meshes.get(object.parentId)
    ;(parent ?? group).add(mesh)
  }
  if ((normalized.joints?.length ?? 0) > 0) {
    group.add(createRigGroup(normalized.joints ?? [], normalized.showRig ?? false))
  }
  return group
}

export function disposeSceneObjectGroup(group: THREE.Group): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      child.geometry.dispose()
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      for (const material of materials) material.dispose()
    }
  })
}
