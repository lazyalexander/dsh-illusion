import { describe, expect, it } from 'vitest'

import type { ArtFrame } from '../src/art/protocol.js'
import { applyPixelEdits, createEditorPatch, editedFrameSvg, pixelKey, rasterizeFrame } from '../src/client/pixelEditor.js'

const frame: ArtFrame = {
  id: 'scene', label: 'Scene',
  rects: [{ id: 'background', x: 0, y: 0, width: 4, height: 4, fill: '#000000' }],
  objects: [{ id: 'wizard', label: 'Wizard', zIndex: 1, locked: false, rects: [{ id: 'wizard.hat', x: 1, y: 1, width: 2, height: 1, fill: '#663399' }] }],
}

describe('pixel editor', () => {
  it('applies paint and erase edits over the immutable frame', () => {
    const pixels = applyPixelEdits(rasterizeFrame(frame, 4, 4), {
      [pixelKey(1, 1)]: null,
      [pixelKey(3, 3)]: '#ffffff',
    }, 4, 4)
    expect(pixels[5]).toBeNull()
    expect(pixels[15]).toBe('#ffffff')
    expect(frame.objects?.[0]?.rects[0]?.fill).toBe('#663399')
  })

  it('creates a deterministic patch and edited SVG reference', () => {
    const edits = { [pixelKey(3, 3)]: '#ffffff', [pixelKey(1, 1)]: null }
    expect(createEditorPatch('art-1', 'scene', 4, 4, edits).edits).toEqual([
      { x: 1, y: 1, color: null },
      { x: 3, y: 3, color: '#ffffff' },
    ])
    const svg = editedFrameSvg(frame, 4, 4, edits)
    expect(svg).toContain('data-editor-pixel="3,3"')
    expect(svg).toContain('<mask id="editor-mask"')
  })
})
