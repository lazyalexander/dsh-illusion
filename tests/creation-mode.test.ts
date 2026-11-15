import { describe, expect, it } from 'vitest'

import { createCreationModePrompt } from '../src/client/creationMode.js'

describe('drawing creation mode', () => {
  it('enters reviewable 2D production explicitly', () => {
    const prompt = createCreationModePrompt(true)
    expect(prompt).toContain('[Illusion drawing mode: ON]')
    expect(prompt).toContain('Use illusion_art')
    expect(prompt).toContain('Do not reinterpret unrelated non-visual requests')
  })

  it('exits without disabling explicit 2D requests', () => {
    const prompt = createCreationModePrompt(false)
    expect(prompt).toContain('[Illusion drawing mode: OFF]')
    expect(prompt).toContain('unless I explicitly ask for 2D art')
  })
})
