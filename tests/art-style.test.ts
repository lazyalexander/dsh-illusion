import { describe, expect, it } from 'vitest'

import { createArtProductionPlan, parseArtStyleContract } from '../src/art/style.js'

const visualLanguage = {
  palette: ['#1d1b2f', '#f6d6bd', '#d95763'],
  line: 'single-pixel dark outline',
  shape: 'compact readable silhouette',
  shading: 'two-value clusters',
  texture: 'manual sparse dithering',
  lighting: 'upper-left key light',
}

describe('2D art style contracts', () => {
  it('normalizes an author-owned pixel style and creates a sprite pipeline', () => {
    const style = parseArtStyleContract({
      id: 'author-forest', name: 'Forest Pocket', version: 1,
      family: 'pixel', authority: 'author', status: 'accepted',
      description: 'Compact forest sprites with warm faces and cool shadows.',
      visualLanguage,
      invariants: ['one-pixel outline', 'no isolated noise pixels'],
      avoid: ['blurred resampling'],
      references: [{ id: 'sheet-a', label: 'Author sprite sheet', rights: 'owned' }],
      pixel: { canvas: [32, 32], colorLimit: 16, pixelPerfect: true, dithering: 'manual' },
    })

    expect(style).toMatchObject({ family: 'pixel', authority: 'author', status: 'accepted' })
    expect(createArtProductionPlan(style, {
      deliverable: 'sprite-sheet', width: 256, height: 256, transparent: true, target: 'godot',
    })).toEqual(['brief', 'style', 'composition', 'draft', 'pixel-cleanup', 'color', 'slicing', 'validation', 'complete'])
  })

  it('keeps Illusion-proposed styles unaccepted until the author confirms them', () => {
    expect(() => parseArtStyleContract({
      id: 'proposal', name: 'Proposal', version: 1,
      family: 'anime', authority: 'illusion-proposal', status: 'accepted',
      description: 'A proposed clean cel style.', visualLanguage,
      anime: { lineWeight: 'varied', celBands: 2, proportion: 'heroic six-head figure' },
    })).toThrow('confirmed by the author')
  })

  it('requires concrete invariants or references for a custom style', () => {
    expect(() => parseArtStyleContract({
      id: 'empty-custom', name: 'Empty', version: 1,
      family: 'custom', authority: 'author', status: 'accepted',
      description: 'Undefined custom style.', visualLanguage,
    })).toThrow('requires author invariants or references')
  })
})
