import { describe, expect, it } from 'vitest'

import { parseArtCommand } from '../src/art/protocol.js'
import { ArtStore } from '../src/art/store.js'

const command = {
  action: 'start', title: 'Wizard cast', phase: 'draft', frameWidth: 32, frameHeight: 32,
  frames: [{
    id: 'ready', label: 'Ready', translations: { 'zh-CN': { title: '待机' } },
    rects: [{ id: 'hat', x: 4, y: 2, width: 8, height: 4, fill: '#663399' }],
  }],
} as const

describe('2D art protocol', () => {
  it('keeps exact frame dimensions and stable visible history', () => {
    const store = new ArtStore(() => 'art-1')
    const first = store.apply(parseArtCommand(command))
    const second = store.apply(parseArtCommand({ ...command, action: 'apply', title: 'Raised staff' }))
    expect(first.steps[0]?.frames[0]?.translations?.['zh-CN']?.title).toBe('待机')
    expect(second.steps).toHaveLength(2)
    expect(second.steps[0]?.frames[0]?.rects[0]?.fill).toBe('#663399')
  })

  it('rejects rectangles outside a frame', () => {
    expect(() => parseArtCommand({
      ...command,
      frames: [{ id: 'bad', label: 'Bad', rects: [{ id: 'overflow', x: 31, y: 0, width: 2, height: 1, fill: '#ffffff' }] }],
    })).toThrow('exceeds the frame')
  })

  it('preserves semantic composition objects and their layer order', () => {
    const parsed = parseArtCommand({
      ...command,
      frames: [{
        id: 'scene', label: 'Scene', rects: [],
        objects: [
          { id: 'wizard', label: 'Wizard', role: 'character.primary', zIndex: 20, rects: [{ id: 'wizard.body', x: 8, y: 8, width: 8, height: 16, fill: '#663399' }] },
          { id: 'door', label: 'Door', role: 'environment.entry', zIndex: 10, locked: true, rects: [{ id: 'door.body', x: 20, y: 4, width: 10, height: 24, fill: '#553311' }] },
        ],
      }],
    })
    expect(parsed.frames[0]?.objects?.map((object) => object.id)).toEqual(['wizard', 'door'])
    expect(parsed.frames[0]?.objects?.[1]?.locked).toBe(true)
  })
})
