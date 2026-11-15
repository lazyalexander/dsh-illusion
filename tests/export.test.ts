import { describe, expect, it } from 'vitest'

import { createBuildExportRecord, safeFilename } from '../src/client/export.js'
import { createSceneObjectGroup, disposeSceneObjectGroup } from '../src/client/sceneObjects.js'
import { parseBuildCommand } from '../src/protocol.js'
import { materializeBuildScene } from '../src/scene.js'
import { BuildStore } from '../src/store.js'

function snapshot() {
  const store = new BuildStore({ createId: () => 'export-build' })
  return store.apply(parseBuildCommand({
    action: 'start',
    title: 'Desk Lamp',
    note: 'Create the base',
    operations: [{
      type: 'upsert',
      object: {
        id: 'base',
        label: 'Weighted base',
        geometry: { kind: 'cylinder', radius: 2, height: 0.4 },
        position: [1, 2, 3],
        color: '#334455',
      },
    }],
  }))
}

describe('build export', () => {
  it('creates a portable record with selected-step thoughts', () => {
    const build = snapshot()
    const thoughts = { '1': { text: 'Keep the base wider.', updatedAt: '2026-11-14T00:00:00.000Z' } }
    const record = createBuildExportRecord(build, thoughts, 1, '2026-11-14T01:00:00.000Z')

    expect(record).toMatchObject({
      schema: 'dsh-illusion/build-export@1',
      exportedAt: '2026-11-14T01:00:00.000Z',
      selectedStep: 1,
      snapshot: { buildId: 'export-build' },
      thoughts,
    })
    expect(safeFilename('Desk Lamp: Final!')).toBe('desk-lamp-final')
  })

  it('creates an exportable scene with stable protocol metadata', () => {
    const build = snapshot()
    const object = materializeBuildScene(build, 0).objects[0]!
    const group = createSceneObjectGroup([object])
    const mesh = group.children[0]!

    expect(mesh.name).toBe('Weighted base')
    expect(mesh.position.toArray()).toEqual([1, 3, 2])
    expect(mesh.userData).toMatchObject({
      illusionId: 'base',
      protocolPosition: [1, 2, 3],
    })
    disposeSceneObjectGroup(group)
  })

  it('builds hierarchical character parts and rig nodes for GLB export', () => {
    const store = new BuildStore({ createId: () => 'character-export' })
    store.apply(parseBuildCommand({
      action: 'start',
      title: 'Character',
      profile: { kind: 'character', style: 'anime', target: 'interactive', height: 1.7 },
      phase: 'blockout',
      operations: [
        {
          type: 'upsert',
          object: {
            id: 'torso',
            label: 'Torso',
            geometry: { kind: 'capsule', radius: 0.2, height: 0.4 },
          },
        },
        {
          type: 'upsert',
          object: {
            id: 'head',
            label: 'Head',
            parentId: 'torso',
            geometry: { kind: 'ellipsoid', radii: [0.13, 0.11, 0.16] },
            position: [0, 0, 0.5],
          },
        },
        {
          type: 'upsert',
          object: {
            id: 'fringe',
            label: 'Fringe',
            parentId: 'head',
            geometry: {
              kind: 'tube',
              radius: 0.01,
              path: [[0, 0, 0.1], [0.04, -0.1, -0.08]],
            },
          },
        },
        {
          type: 'upsert_joint',
          joint: { id: 'hips', label: 'Hips', role: 'hips', position: [0, 0, 0.9] },
        },
        {
          type: 'upsert_joint',
          joint: { id: 'spine', label: 'Spine', parentId: 'hips', role: 'spine', position: [0, 0, 0.25] },
        },
      ],
    }))
    const build = store.snapshot()
    const scene = materializeBuildScene(build, 0)
    const group = createSceneObjectGroup(scene.objects, { joints: scene.joints })

    expect(group.getObjectByName('Head')?.parent?.name).toBe('Torso')
    expect(group.getObjectByName('Fringe')?.parent?.name).toBe('Head')
    expect(group.getObjectByName('Spine')?.parent?.name).toBe('Hips')
    expect(group.getObjectByName('Illusion rig')?.userData).toMatchObject({
      illusionRig: true,
      illusionJointCount: 2,
    })
    disposeSceneObjectGroup(group)
  })
})
