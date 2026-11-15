import type { ArtFrame, ArtRect } from '../art/protocol.js'

export type PixelEditValue = string | null
export type PixelEdits = Readonly<Record<string, PixelEditValue>>

export interface PixelEditRecord {
  readonly x: number
  readonly y: number
  readonly color: string | null
}

export interface EditorPatch {
  readonly schema: 'dsh-illusion/editor-patch@1'
  readonly artId: string
  readonly frameId: string
  readonly width: number
  readonly height: number
  readonly edits: readonly PixelEditRecord[]
}

export function pixelKey(x: number, y: number): string {
  return `${x},${y}`
}

export function parsePixelKey(key: string): readonly [number, number] {
  const [x, y] = key.split(',').map(Number)
  if (!Number.isInteger(x) || !Number.isInteger(y)) throw new TypeError('invalid pixel key')
  return [x as number, y as number]
}

export function orderedFrameRects(frame: ArtFrame): readonly ArtRect[] {
  const objects = [...(frame.objects ?? [])].sort((a, b) => a.zIndex - b.zIndex)
  return [...frame.rects, ...objects.flatMap((object) => object.rects)]
}

export function rasterizeFrame(frame: ArtFrame, width: number, height: number): readonly (string | null)[] {
  const pixels = Array<string | null>(width * height).fill(null)
  for (const rect of orderedFrameRects(frame)) {
    for (let y = rect.y; y < rect.y + rect.height; y += 1) {
      for (let x = rect.x; x < rect.x + rect.width; x += 1) pixels[y * width + x] = rect.fill
    }
  }
  return pixels
}

export function applyPixelEdits(
  pixels: readonly (string | null)[],
  edits: PixelEdits,
  width: number,
  height: number,
): readonly (string | null)[] {
  const result = [...pixels]
  for (const [key, color] of Object.entries(edits)) {
    const [x, y] = parsePixelKey(key)
    if (x < 0 || y < 0 || x >= width || y >= height) continue
    result[y * width + x] = color
  }
  return result
}

export function createEditorPatch(
  artId: string,
  frameId: string,
  width: number,
  height: number,
  edits: PixelEdits,
): EditorPatch {
  return {
    schema: 'dsh-illusion/editor-patch@1',
    artId,
    frameId,
    width,
    height,
    edits: Object.entries(edits).map(([key, color]) => {
      const [x, y] = parsePixelKey(key)
      return { x, y, color }
    }).sort((a, b) => a.y - b.y || a.x - b.x),
  }
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function editedFrameSvg(
  frame: ArtFrame,
  width: number,
  height: number,
  edits: PixelEdits,
): string {
  const maskId = 'editor-mask'
  const erased = Object.entries(edits).filter(([, color]) => color === null).map(([key]) => {
    const [x, y] = parsePixelKey(key)
    return `<rect x="${x}" y="${y}" width="1" height="1" fill="#000000"/>`
  }).join('')
  const base = orderedFrameRects(frame).map((rect) => `<rect id="${escapeXml(rect.id)}" x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="${rect.fill}"/>`).join('')
  const painted = Object.entries(edits).filter(([, color]) => color !== null).map(([key, color]) => {
    const [x, y] = parsePixelKey(key)
    return `<rect data-editor-pixel="${x},${y}" x="${x}" y="${y}" width="1" height="1" fill="${color as string}"/>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges"><defs><mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#ffffff"/>${erased}</mask></defs><g mask="url(#${maskId})">${base}</g>${painted}</svg>`
}
