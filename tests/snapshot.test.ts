import { describe, expect, it } from 'vitest'

import { findBuildSnapshot } from '../src/client/snapshot.js'

const snapshot = {
  protocol: 1 as const,
  buildId: 'b1',
  title: 'Chair',
  status: 'building' as const,
  revision: 1,
  activeStep: 0,
  steps: [],
}

describe('findBuildSnapshot', () => {
  it('finds presentation metadata inside an unknown tool-view prop shape', () => {
    expect(findBuildSnapshot({ block: { result: { meta: { illusionSnapshot: snapshot } } } }))
      .toEqual(snapshot)
  })

  it('accepts current delta snapshots while keeping protocol 1 replay compatible', () => {
    const current = { ...snapshot, protocol: 2 as const, profile: { kind: 'character' }, steps: [] }
    expect(findBuildSnapshot({ illusionSnapshot: current })).toEqual(current)
  })

  it('does not loop on cyclic props', () => {
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    expect(findBuildSnapshot(cyclic)).toBeUndefined()
  })
})
