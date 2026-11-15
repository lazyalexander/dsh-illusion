import type { ArtPhase } from './style.js'
import type { StepTranslations } from '../protocol.js'

export interface ArtRect {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly fill: string
}

export interface ArtFrame {
  readonly id: string
  readonly label: string
  readonly translations?: StepTranslations
  readonly rects: readonly ArtRect[]
  readonly objects?: readonly ArtObject[]
}

export interface ArtObject {
  readonly id: string
  readonly label: string
  readonly role?: string
  readonly zIndex: number
  readonly locked: boolean
  readonly rects: readonly ArtRect[]
}

export interface ArtCommand {
  readonly action: 'start' | 'apply' | 'complete'
  readonly title: string
  readonly note?: string
  readonly translations?: StepTranslations
  readonly phase: ArtPhase
  readonly frameWidth: number
  readonly frameHeight: number
  readonly frames: readonly ArtFrame[]
}

export interface ArtStep extends ArtCommand {
  readonly index: number
  readonly status: 'building' | 'complete'
}

export interface ArtSnapshot {
  readonly protocol: 1
  readonly artId: string
  readonly title: string
  readonly status: 'building' | 'complete'
  readonly revision: number
  readonly activeStep: number
  readonly steps: readonly ArtStep[]
}

export const ART_LIMITS = {
  frames: 24,
  frameSize: 512,
  rectsPerFrame: 512,
  objectsPerFrame: 64,
  steps: 96,
  text: 160,
} as const

const phases = new Set<ArtPhase>([
  'brief', 'style', 'composition', 'draft', 'pixel-cleanup', 'lineart', 'color',
  'render', 'slicing', 'validation', 'complete',
])

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object`)
  return value as Record<string, unknown>
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > ART_LIMITS.text) {
    throw new TypeError(`${label} must be a non-empty string of at most ${ART_LIMITS.text} characters`)
  }
  return value.trim()
}

function integer(value: unknown, label: string, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new RangeError(`${label} must be an integer between ${minimum} and ${maximum}`)
  }
  return value as number
}

function translations(value: unknown): StepTranslations | undefined {
  if (value === undefined) return undefined
  const input = object(value, 'translations')
  const result: Partial<Record<'en' | 'zh-CN', { title: string; note?: string }>> = {}
  for (const locale of ['en', 'zh-CN'] as const) {
    if (input[locale] === undefined) continue
    const item = object(input[locale], `translations.${locale}`)
    result[locale] = {
      title: text(item.title, `translations.${locale}.title`),
      ...(item.note === undefined ? {} : { note: text(item.note, `translations.${locale}.note`) }),
    }
  }
  return result
}

export function parseArtCommand(value: unknown): ArtCommand {
  const input = object(value, 'art command')
  if (input.action !== 'start' && input.action !== 'apply' && input.action !== 'complete') throw new TypeError('action is not supported')
  if (!phases.has(input.phase as ArtPhase)) throw new TypeError('phase is not supported')
  const frameWidth = integer(input.frameWidth, 'frameWidth', 1, ART_LIMITS.frameSize)
  const frameHeight = integer(input.frameHeight, 'frameHeight', 1, ART_LIMITS.frameSize)
  if (!Array.isArray(input.frames) || input.frames.length < 1 || input.frames.length > ART_LIMITS.frames) {
    throw new RangeError(`frames must contain between 1 and ${ART_LIMITS.frames} items`)
  }
  const frames = input.frames.map((value, frameIndex): ArtFrame => {
    const frame = object(value, `frames[${frameIndex}]`)
    if (!Array.isArray(frame.rects) || frame.rects.length > ART_LIMITS.rectsPerFrame) {
      throw new RangeError(`frames[${frameIndex}].rects may contain at most ${ART_LIMITS.rectsPerFrame} items`)
    }
    const parseRects = (values: readonly unknown[], label: string): ArtRect[] => values.map((value, rectIndex): ArtRect => {
      const rect = object(value, `frames[${frameIndex}].rects[${rectIndex}]`)
      const x = integer(rect.x, `rect.x`, 0, frameWidth - 1)
      const y = integer(rect.y, `rect.y`, 0, frameHeight - 1)
      const width = integer(rect.width, `rect.width`, 1, frameWidth)
      const height = integer(rect.height, `rect.height`, 1, frameHeight)
      if (x + width > frameWidth || y + height > frameHeight) throw new RangeError(`frames[${frameIndex}].rects[${rectIndex}] exceeds the frame`)
      const fill = text(rect.fill, 'rect.fill').toLowerCase()
      if (!/^#[0-9a-f]{6}$/.test(fill)) throw new TypeError('rect.fill must be a six-digit hex color')
      return { id: text(rect.id, 'rect.id'), x, y, width, height, fill }
    })
    const rects = parseRects(frame.rects, `frames[${frameIndex}].rects`)
    if (new Set(rects.map((rect) => rect.id)).size !== rects.length) throw new RangeError(`frames[${frameIndex}] rect IDs must be unique`)
    let objects: ArtObject[] | undefined
    if (frame.objects !== undefined) {
      if (!Array.isArray(frame.objects) || frame.objects.length > ART_LIMITS.objectsPerFrame) {
        throw new RangeError(`frames[${frameIndex}].objects may contain at most ${ART_LIMITS.objectsPerFrame} items`)
      }
      objects = frame.objects.map((value, objectIndex): ArtObject => {
        const item = object(value, `frames[${frameIndex}].objects[${objectIndex}]`)
        if (!Array.isArray(item.rects) || item.rects.length < 1 || item.rects.length > ART_LIMITS.rectsPerFrame) {
          throw new RangeError(`frames[${frameIndex}].objects[${objectIndex}].rects is invalid`)
        }
        return {
          id: text(item.id, 'object.id'),
          label: text(item.label, 'object.label'),
          ...(item.role === undefined ? {} : { role: text(item.role, 'object.role') }),
          zIndex: integer(item.zIndex ?? objectIndex, 'object.zIndex', -10_000, 10_000),
          locked: item.locked === true,
          rects: parseRects(item.rects, `frames[${frameIndex}].objects[${objectIndex}].rects`),
        }
      })
      if (new Set(objects.map((item) => item.id)).size !== objects.length) throw new RangeError(`frames[${frameIndex}] object IDs must be unique`)
      const objectRectIds = objects.flatMap((item) => item.rects.map((rect) => rect.id))
      if (new Set(objectRectIds).size !== objectRectIds.length) throw new RangeError(`frames[${frameIndex}] object rect IDs must be unique`)
      if (rects.length + objectRectIds.length > ART_LIMITS.rectsPerFrame) throw new RangeError(`frames[${frameIndex}] contains too many total rects`)
    }
    const localized = translations(frame.translations)
    return {
      id: text(frame.id, `frames[${frameIndex}].id`),
      label: text(frame.label, `frames[${frameIndex}].label`),
      ...(localized === undefined ? {} : { translations: localized }),
      rects,
      ...(objects === undefined ? {} : { objects }),
    }
  })
  if (new Set(frames.map((frame) => frame.id)).size !== frames.length) throw new RangeError('frame IDs must be unique')
  const localized = translations(input.translations)
  return {
    action: input.action,
    title: text(input.title, 'title'),
    ...(input.note === undefined ? {} : { note: text(input.note, 'note') }),
    ...(localized === undefined ? {} : { translations: localized }),
    phase: input.phase as ArtPhase,
    frameWidth,
    frameHeight,
    frames,
  }
}
