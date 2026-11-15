import { describe, expect, it } from 'vitest'

import { createArtReviewPrompt } from '../src/client/artReview.js'
import type { ArtSnapshot } from '../src/art/protocol.js'

describe('2D art review prompt', () => {
  it('binds feedback to one frame and pixel region', () => {
    const snapshot: ArtSnapshot = {
      protocol: 1, artId: 'art-1', title: 'Wizard', status: 'building', revision: 1, activeStep: 0,
      steps: [{ action: 'start', title: 'Draft', phase: 'draft', frameWidth: 32, frameHeight: 32, index: 1, status: 'building', frames: [{ id: 'release', label: 'Release', rects: [] }] }],
    }
    const prompt = createArtReviewPrompt(snapshot, {
      text: 'The staff tip is too low.', files: [],
      focus: { frameId: 'release', frameIndex: 0, x: 20, y: 4, width: 5, height: 6 },
    })
    expect(prompt).toContain('frame 1 (release)')
    expect(prompt).toContain('x=20, y=4, width=5, height=6')
    expect(prompt).toContain('all content outside the named target unchanged')
  })

  it('binds feedback to a semantic composition object', () => {
    const snapshot: ArtSnapshot = {
      protocol: 1, artId: 'art-1', title: 'Scene', status: 'building', revision: 1, activeStep: 0,
      steps: [{ action: 'start', title: 'Draft', phase: 'composition', frameWidth: 64, frameHeight: 64, index: 1, status: 'building', frames: [{ id: 'scene', label: 'Scene', rects: [] }] }],
    }
    const prompt = createArtReviewPrompt(snapshot, {
      text: 'Move the wizard left of the door.', files: [],
      focus: { frameId: 'scene', frameIndex: 0, x: 8, y: 8, width: 12, height: 24, objectId: 'wizard', objectLabel: 'Wizard' },
    })
    expect(prompt).toContain('object wizard (Wizard)')
    expect(prompt).toContain('Preserve stable composition object IDs and zIndex')
  })

  it('marks a saved editor image and pixel patch as authoritative references', () => {
    const snapshot: ArtSnapshot = {
      protocol: 1, artId: 'art-1', title: 'Scene', status: 'building', revision: 1, activeStep: 0,
      steps: [{ action: 'start', title: 'Draft', phase: 'draft', frameWidth: 32, frameHeight: 32, index: 1, status: 'building', frames: [{ id: 'ready', label: 'Ready', rects: [] }] }],
    }
    const prompt = createArtReviewPrompt(snapshot, {
      text: '', files: [], editorReference: { frameId: 'ready', editCount: 3, digest: 'abc123' },
    })
    expect(prompt).toContain('editor-saved authoritative reference')
    expect(prompt).toContain('3 explicit pixel edits')
    expect(prompt).toContain('SHA-256 abc123')
  })
})
