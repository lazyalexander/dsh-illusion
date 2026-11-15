import { describe, expect, it } from 'vitest'

import { STEP_THOUGHT_LIMIT, updateStepThought } from '../src/client/thoughts.js'

describe('step thoughts', () => {
  it('records an immutable latest thought for each step', () => {
    const original = { '1': { text: 'First idea', updatedAt: '2026-11-14T00:00:00.000Z' } }
    const updated = updateStepThought(original, 2, 'Try a longer arm.', '2026-11-14T01:00:00.000Z')

    expect(updated).toEqual({
      '1': original['1'],
      '2': { text: 'Try a longer arm.', updatedAt: '2026-11-14T01:00:00.000Z' },
    })
    expect(original).not.toHaveProperty('2')
  })

  it('bounds locally authored text', () => {
    const updated = updateStepThought({}, 1, 'x'.repeat(STEP_THOUGHT_LIMIT + 20))
    expect(updated['1']?.text).toHaveLength(STEP_THOUGHT_LIMIT)
  })
})
