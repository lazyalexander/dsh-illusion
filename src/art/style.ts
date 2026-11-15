export type ArtStyleFamily = 'pixel' | 'anime' | 'custom'
export type StyleAuthority = 'author' | 'shared' | 'illusion-proposal'
export type ReferenceRights = 'owned' | 'licensed' | 'public-domain' | 'unknown'

export interface StyleReference {
  readonly id: string
  readonly label: string
  readonly rights: ReferenceRights
  readonly note?: string
}

export interface ArtStyleContract {
  readonly schema: 'dsh-illusion/style-contract@1'
  readonly id: string
  readonly name: string
  readonly version: number
  readonly family: ArtStyleFamily
  readonly authority: StyleAuthority
  readonly status: 'proposed' | 'accepted'
  readonly description: string
  readonly visualLanguage: {
    readonly palette: readonly string[]
    readonly line: string
    readonly shape: string
    readonly shading: string
    readonly texture: string
    readonly lighting: string
  }
  readonly invariants: readonly string[]
  readonly avoid: readonly string[]
  readonly references: readonly StyleReference[]
  readonly pixel?: {
    readonly canvas: readonly [number, number]
    readonly colorLimit: number
    readonly pixelPerfect: boolean
    readonly dithering: 'none' | 'ordered' | 'manual'
  }
  readonly anime?: {
    readonly lineWeight: 'thin' | 'medium' | 'varied'
    readonly celBands: number
    readonly proportion: string
  }
}

export type ArtDeliverable =
  | 'concept'
  | 'portrait'
  | 'sprite'
  | 'sprite-sheet'
  | 'background'
  | 'tile-set'
  | 'ui-icon'
  | 'texture'

export type ArtPhase =
  | 'brief'
  | 'style'
  | 'composition'
  | 'draft'
  | 'pixel-cleanup'
  | 'lineart'
  | 'color'
  | 'render'
  | 'slicing'
  | 'validation'
  | 'complete'

export interface ArtProductionBrief {
  readonly deliverable: ArtDeliverable
  readonly width: number
  readonly height: number
  readonly transparent: boolean
  readonly target: 'generic' | 'godot' | 'unity' | 'unreal' | 'web' | 'print'
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object`)
  return value as Record<string, unknown>
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new TypeError(`${label} must be a non-empty string`)
  if (value.trim().length > 240) throw new RangeError(`${label} is too long`)
  return value.trim()
}

function textList(value: unknown, label: string, maximum: number): readonly string[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > maximum) throw new RangeError(`${label} must contain at most ${maximum} items`)
  return value.map((item, index) => text(item, `${label}[${index}]`))
}

function positiveInteger(value: unknown, label: string, maximum: number): number {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > maximum) {
    throw new RangeError(`${label} must be an integer between 1 and ${maximum}`)
  }
  return value as number
}

function color(value: unknown, label: string): string {
  const parsed = text(value, label)
  if (!/^#[0-9a-f]{6}$/i.test(parsed)) throw new TypeError(`${label} must be a six-digit hex color`)
  return parsed.toLowerCase()
}

export function parseArtStyleContract(value: unknown): ArtStyleContract {
  const input = object(value, 'style')
  if (input.family !== 'pixel' && input.family !== 'anime' && input.family !== 'custom') {
    throw new TypeError('style.family must be pixel, anime, or custom')
  }
  if (input.authority !== 'author' && input.authority !== 'shared' && input.authority !== 'illusion-proposal') {
    throw new TypeError('style.authority is not supported')
  }
  if (input.status !== 'proposed' && input.status !== 'accepted') throw new TypeError('style.status is not supported')
  if (input.authority === 'illusion-proposal' && input.status === 'accepted') {
    throw new RangeError('an Illusion proposal must be confirmed by the author before acceptance')
  }
  const authority = input.authority as StyleAuthority
  const status = input.status as ArtStyleContract['status']
  const visual = object(input.visualLanguage, 'style.visualLanguage')
  const references = input.references === undefined ? [] : (() => {
    if (!Array.isArray(input.references) || input.references.length > 16) throw new RangeError('style.references must contain at most 16 items')
    return input.references.map((value, index): StyleReference => {
      const item = object(value, `style.references[${index}]`)
      if (item.rights !== 'owned' && item.rights !== 'licensed' && item.rights !== 'public-domain' && item.rights !== 'unknown') {
        throw new TypeError(`style.references[${index}].rights is not supported`)
      }
      return {
        id: text(item.id, `style.references[${index}].id`),
        label: text(item.label, `style.references[${index}].label`),
        rights: item.rights,
        ...(item.note === undefined ? {} : { note: text(item.note, `style.references[${index}].note`) }),
      }
    })
  })()
  if (new Set(references.map((item) => item.id)).size !== references.length) throw new RangeError('style reference IDs must be unique')

  const base = {
    schema: 'dsh-illusion/style-contract@1' as const,
    id: text(input.id, 'style.id'),
    name: text(input.name, 'style.name'),
    version: positiveInteger(input.version, 'style.version', 10_000),
    family: input.family,
    authority,
    status,
    description: text(input.description, 'style.description'),
    visualLanguage: {
      palette: (() => {
        if (!Array.isArray(visual.palette) || visual.palette.length < 1 || visual.palette.length > 64) {
          throw new RangeError('style.visualLanguage.palette must contain between 1 and 64 colors')
        }
        return visual.palette.map((item, index) => color(item, `style.visualLanguage.palette[${index}]`))
      })(),
      line: text(visual.line, 'style.visualLanguage.line'),
      shape: text(visual.shape, 'style.visualLanguage.shape'),
      shading: text(visual.shading, 'style.visualLanguage.shading'),
      texture: text(visual.texture, 'style.visualLanguage.texture'),
      lighting: text(visual.lighting, 'style.visualLanguage.lighting'),
    },
    invariants: textList(input.invariants, 'style.invariants', 32),
    avoid: textList(input.avoid, 'style.avoid', 32),
    references,
  }

  if (input.family === 'pixel') {
    const pixel = object(input.pixel, 'style.pixel')
    if (!Array.isArray(pixel.canvas) || pixel.canvas.length !== 2) throw new TypeError('style.pixel.canvas must contain width and height')
    if (pixel.dithering !== 'none' && pixel.dithering !== 'ordered' && pixel.dithering !== 'manual') {
      throw new TypeError('style.pixel.dithering is not supported')
    }
    return {
      ...base,
      family: 'pixel',
      pixel: {
        canvas: [
          positiveInteger(pixel.canvas[0], 'style.pixel.canvas[0]', 4096),
          positiveInteger(pixel.canvas[1], 'style.pixel.canvas[1]', 4096),
        ],
        colorLimit: positiveInteger(pixel.colorLimit, 'style.pixel.colorLimit', 256),
        pixelPerfect: pixel.pixelPerfect !== false,
        dithering: pixel.dithering,
      },
    }
  }
  if (input.family === 'anime') {
    const anime = object(input.anime, 'style.anime')
    if (anime.lineWeight !== 'thin' && anime.lineWeight !== 'medium' && anime.lineWeight !== 'varied') {
      throw new TypeError('style.anime.lineWeight is not supported')
    }
    return {
      ...base,
      family: 'anime',
      anime: {
        lineWeight: anime.lineWeight,
        celBands: positiveInteger(anime.celBands, 'style.anime.celBands', 8),
        proportion: text(anime.proportion, 'style.anime.proportion'),
      },
    }
  }
  if (base.invariants.length === 0 && references.length === 0) {
    throw new RangeError('a custom style requires author invariants or references')
  }
  return { ...base, family: 'custom' }
}

export function createArtProductionPlan(style: ArtStyleContract, brief: ArtProductionBrief): readonly ArtPhase[] {
  positiveInteger(brief.width, 'brief.width', 16_384)
  positiveInteger(brief.height, 'brief.height', 16_384)
  const phases: ArtPhase[] = ['brief', 'style', 'composition', 'draft']
  if (style.family === 'pixel') phases.push('pixel-cleanup', 'color')
  else phases.push('lineart', 'color', 'render')
  if (brief.deliverable === 'sprite-sheet' || brief.deliverable === 'tile-set') phases.push('slicing')
  phases.push('validation', 'complete')
  return phases
}
