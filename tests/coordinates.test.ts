import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { applyProtocolTransform } from '../src/client/coordinates.js'
import { parseBuildCommand } from '../src/protocol.js'

function sceneObject(rotation: readonly [number, number, number]) {
  const command = parseBuildCommand({
    action: 'start',
    title: 'Transform test',
    operations: [{
      type: 'upsert',
      object: {
        id: 'part',
        geometry: { kind: 'cylinder' },
        position: [1, 2, 3],
        rotation,
        scale: [4, 5, 6],
      },
    }],
  })
  const operation = command.operations[0]
  if (operation?.type !== 'upsert') throw new Error('expected an upsert operation')
  return operation.object
}

describe('protocol coordinate projection', () => {
  it('maps Z-up positions and scales into the Y-up viewer', () => {
    const target = new THREE.Object3D()
    applyProtocolTransform(target, sceneObject([0, 0, 0]))

    expect(target.position.toArray()).toEqual([1, 3, 2])
    expect(target.scale.toArray()).toEqual([4, 6, 5])
  })

  it.each([
    [[90, 0, 0], [0, 0, -1]],
    [[0, 90, 0], [1, 0, 0]],
    [[0, 0, 90], [0, 0, 1]],
  ] as const)('preserves right-handed rotation %j', (rotation, expectedAxis) => {
    const target = new THREE.Object3D()
    applyProtocolTransform(target, sceneObject(rotation))
    const localAxis = rotation[2] === 90
      ? new THREE.Vector3(1, 0, 0)
      : new THREE.Vector3(0, 1, 0)

    const transformed = localAxis.applyQuaternion(target.quaternion).toArray()
    expect(transformed[0]).toBeCloseTo(expectedAxis[0])
    expect(transformed[1]).toBeCloseTo(expectedAxis[1])
    expect(transformed[2]).toBeCloseTo(expectedAxis[2])
  })
})
