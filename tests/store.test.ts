import { describe, expect, it } from 'vitest'

import { parseBuildCommand } from '../src/protocol.js'
import { materializeBuildScene } from '../src/scene.js'
import { BuildStore } from '../src/store.js'

function command(value: unknown) {
  return parseBuildCommand(value)
}

describe('BuildStore', () => {
  it('persists game semantics by checkpoint and rejects broken references atomically', () => {
    const store = new BuildStore({ createId: () => 'semantic-build' })
    const first = store.apply(command({
      action: 'start', title: 'Crate',
      profile: { kind: 'game-asset', category: 'prop' },
      operations: [{ type: 'upsert', object: { id: 'crate', geometry: { kind: 'box' } } }],
      semantics: {
        pivot: { position: [0, 0, 0] }, bounds: { min: [-1, -1, 0], max: [1, 1, 2] },
        sockets: [{ id: 'carry', parentId: 'crate' }],
        colliders: [{ id: 'body', ownerId: 'crate', shape: 'box', size: [2, 2, 2] }],
        materialSlots: [{ id: 'surface', objectIds: ['crate'] }],
        lodGroups: [{ id: 'main', levels: [{ level: 0, screenCoverage: 1, objectIds: ['crate'] }] }],
      },
    }))
    expect(materializeBuildScene(first, 0).semantics).toMatchObject({ sockets: [{ id: 'carry' }] })

    const before = store.snapshot()
    expect(() => store.apply(command({
      action: 'apply', title: 'Remove semantic owner', operations: [{ type: 'remove', id: 'crate' }],
    }))).toThrow('references missing object')
    expect(store.snapshot()).toEqual(before)
  })

  it('resumes an immutable branch checkpoint into a new build lineage', () => {
    const source = new BuildStore({ createId: () => 'source-build' })
    source.apply(command({
      action: 'start',
      title: 'Source',
      operations: [{ type: 'upsert', object: { id: 'base', geometry: { kind: 'box' } } }],
    }))
    const sourceSnapshot = source.apply(command({
      action: 'apply',
      title: 'Second part',
      operations: [{ type: 'upsert', object: { id: 'top', geometry: { kind: 'sphere' } } }],
    }))
    const branch = new BuildStore({ createId: () => 'branch-build' })
    const resumed = branch.resume(sourceSnapshot, 1, command({
      action: 'resume',
      title: 'Branch from base',
      sourceBuildId: 'source-build',
      sourceStep: 1,
    }))

    expect(resumed).toMatchObject({
      buildId: 'branch-build',
      lineage: { buildId: 'source-build', step: 1 },
      revision: 1,
      status: 'building',
    })
    expect(materializeBuildScene(resumed, 0).objects.map((object) => object.id)).toEqual(['base'])
    expect(sourceSnapshot.steps).toHaveLength(2)
  })

  it('records replayable immutable steps across a complete build', () => {
    const store = new BuildStore({ createId: () => 'build-1' })
    const first = store.apply(command({
      action: 'start',
      title: 'Desk lamp',
      note: 'Create the base',
      operations: [{
        type: 'upsert',
        object: { id: 'base', geometry: { kind: 'cylinder', radius: 4, height: 1 }, color: '#203c68' },
      }],
    }))
    const second = store.apply(command({
      action: 'apply',
      title: 'Raise the stem',
      operations: [{
        type: 'upsert',
        object: {
          id: 'stem',
          geometry: { kind: 'cylinder', radius: 0.5, height: 10 },
          position: [0, 0, 5.5],
          color: '#d9b26f',
        },
      }],
    }))
    const done = store.apply(command({ action: 'complete', title: 'Finish lamp' }))

    expect(materializeBuildScene(first, 0).objects).toHaveLength(1)
    expect(materializeBuildScene(second, 0).objects).toHaveLength(1)
    expect(materializeBuildScene(second, 1).objects).toHaveLength(2)
    expect(done).toMatchObject({
      protocol: 2,
      buildId: 'build-1',
      title: 'Desk lamp',
      status: 'complete',
      revision: 3,
      activeStep: 2,
    })
    expect(done.steps[2]?.objects).toBeUndefined()
    expect(done.steps[2]?.objectCount).toBe(2)
    expect(materializeBuildScene(done, 2).objects).toHaveLength(2)
    const reopened = store.apply(command({
      action: 'apply',
      title: 'Late edit',
      operations: [{ type: 'remove', id: 'stem' }],
    }))
    expect(reopened.status).toBe('building')
    expect(reopened.revision).toBe(4)
    expect(materializeBuildScene(reopened, reopened.activeStep).objects.map((object) => object.id)).toEqual(['base'])
    const completedAgain = store.apply(command({ action: 'complete', title: 'Finish revised lamp' }))
    expect(completedAgain.status).toBe('complete')
  })

  it('starts a clean build after completion', () => {
    let id = 0
    const store = new BuildStore({ createId: () => `build-${++id}` })
    store.apply(command({ action: 'start', title: 'One' }))
    store.apply(command({ action: 'complete', title: 'Done' }))
    const next = store.apply(command({ action: 'start', title: 'Two' }))

    expect(next.buildId).toBe('build-2')
    expect(next.title).toBe('Two')
    expect(next.revision).toBe(1)
    expect(next.steps).toHaveLength(1)
  })

  it('keeps the previous state when an operation batch exceeds the object cap', () => {
    const store = new BuildStore({ createId: () => 'bounded' })
    store.apply(command({ action: 'start', title: 'Bounded scene' }))
    for (let batch = 0; batch < 4; batch += 1) {
      store.apply(command({
        action: 'apply',
        title: `Batch ${batch}`,
        operations: Array.from({ length: 64 }, (_, index) => ({
          type: 'upsert',
          object: { id: `item-${batch}-${index}`, geometry: { kind: 'box' } },
        })),
      }))
    }
    const before = store.snapshot()
    expect(() => store.apply(command({
      action: 'apply',
      title: 'One too many',
      operations: [{ type: 'upsert', object: { id: 'overflow', geometry: { kind: 'box' } } }],
    }))).toThrow('at most 256 objects')
    expect(store.snapshot()).toEqual(before)
  })

  it('stores character steps as deltas and validates part and joint hierarchies atomically', () => {
    const store = new BuildStore({ createId: () => 'character-1' })
    store.apply(command({
      action: 'start',
      title: 'Hero',
      phase: 'blockout',
      profile: { kind: 'character', style: 'stylized', target: 'game', height: 1.8 },
      operations: [
        {
          type: 'upsert',
          object: { id: 'torso', role: 'body.torso', geometry: { kind: 'capsule', radius: 0.2, height: 0.4 } },
        },
        {
          type: 'upsert_joint',
          joint: { id: 'hips', role: 'hips', position: [0, 0, 0.9] },
        },
      ],
    }))
    const second = store.apply(command({
      action: 'apply',
      title: 'Add head and spine',
      phase: 'anatomy',
      operations: [
        {
          type: 'upsert',
          object: {
            id: 'head',
            parentId: 'torso',
            role: 'body.head',
            geometry: { kind: 'ellipsoid', radii: [0.13, 0.11, 0.16] },
            position: [0, 0, 0.48],
          },
        },
        {
          type: 'upsert_joint',
          joint: { id: 'spine', parentId: 'hips', role: 'spine', position: [0, 0, 0.25] },
        },
      ],
    }))

    expect(second.profile).toMatchObject({ kind: 'character', target: 'game' })
    expect(second.steps[1]).toMatchObject({ phase: 'anatomy', objectCount: 2, jointCount: 2 })
    expect(second.steps[1]?.objects).toBeUndefined()
    expect(materializeBuildScene(second, 1)).toMatchObject({
      objects: [{ id: 'torso' }, { id: 'head', parentId: 'torso' }],
      joints: [{ id: 'hips' }, { id: 'spine', parentId: 'hips' }],
    })

    const before = store.snapshot()
    expect(() => store.apply(command({
      action: 'apply',
      title: 'Broken hierarchy',
      operations: [{
        type: 'upsert',
        object: { id: 'orphan', parentId: 'missing', geometry: { kind: 'sphere' } },
      }],
    }))).toThrow('missing parent')
    expect(store.snapshot()).toEqual(before)
  })

  it('keeps a replay checkpoint when a long character build exceeds the step window', () => {
    const store = new BuildStore({ createId: () => 'long-build' })
    store.apply(command({
      action: 'start',
      title: 'Long build',
      operations: [{
        type: 'upsert',
        object: { id: 'head', geometry: { kind: 'sphere' }, position: [0, 0, 0] },
      }],
    }))
    for (let revision = 1; revision <= 96; revision += 1) {
      store.apply(command({
        action: 'apply',
        title: `Refine ${revision}`,
        operations: [{
          type: 'upsert',
          object: { id: 'head', geometry: { kind: 'sphere' }, position: [revision, 0, 0] },
        }],
      }))
    }

    const snapshot = store.snapshot()
    expect(snapshot.steps).toHaveLength(96)
    expect(snapshot.steps[0]?.index).toBe(2)
    expect(snapshot.steps[0]?.objects).toHaveLength(1)
    expect(materializeBuildScene(snapshot, 0).objects[0]?.position).toEqual([1, 0, 0])
    expect(materializeBuildScene(snapshot, 95).objects[0]?.position).toEqual([96, 0, 0])
  })
})
