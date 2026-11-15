import * as THREE from 'three'

import type { SceneObject, Vec3 } from '../protocol.js'

const AXIS_SWAP = new THREE.Matrix4().set(
  1, 0, 0, 0,
  0, 0, 1, 0,
  0, 1, 0, 0,
  0, 0, 0, 1,
)

export function applyProtocolPose(
  target: THREE.Object3D,
  position: Vec3,
  rotationDegrees: Vec3,
  scale: Vec3 = [1, 1, 1],
): void {
  target.position.set(position[0], position[2], position[1])

  const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(rotationDegrees[0]),
    THREE.MathUtils.degToRad(rotationDegrees[1]),
    THREE.MathUtils.degToRad(rotationDegrees[2]),
    'XYZ',
  ))
  const viewerRotation = AXIS_SWAP.clone().multiply(rotation).multiply(AXIS_SWAP)
  target.quaternion.setFromRotationMatrix(viewerRotation)
  target.scale.set(scale[0], scale[2], scale[1])
}

export function applyProtocolTransform(target: THREE.Object3D, object: SceneObject): void {
  applyProtocolPose(target, object.position, object.rotation, object.scale)
}
