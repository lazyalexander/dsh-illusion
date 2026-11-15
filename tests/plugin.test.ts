import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'

import { apply } from '../src/index.js'

interface CapturedDefinition {
  readonly name: string
  readonly description: string
  readonly parameters: Record<string, unknown>
  readonly execute: (args: unknown, exec: { agent: object; signal: AbortSignal }) => Promise<{
    summary: string
    snapshot: { revision: number; steps: readonly unknown[] }
  }>
  readonly output: {
    readonly presentationMeta: (args: unknown, value: unknown) => Record<string, unknown>
  }
}

interface PropertySchema {
  readonly maxLength?: number
  readonly properties?: Record<string, unknown>
}

describe('DSH plugin entry', () => {
  it('registers guidance and working 3D and 2D tools', async () => {
    const definitions = new Map<string, CapturedDefinition>()
    const guidance: string[] = []
    const disposers: (() => void)[] = []
    const ctx = {
      tools: {
        register(value: CapturedDefinition) {
          definitions.set(value.name, value)
          return () => undefined
        },
      },
      systemPrompt: {
        section(value: { text: string }) {
          guidance.push(value.text)
          return () => undefined
        },
      },
      effect(register: () => () => void) {
        disposers.push(register())
      },
    } as unknown as Context

    apply(ctx)
    const joinedGuidance = guidance.join('\n')
    const definition = definitions.get('illusion_build')
    expect(joinedGuidance).toContain('DeepSeek owns the modeling decisions')
    expect(joinedGuidance).toContain('translations.zh-CN')
    expect(joinedGuidance).toContain('profile.kind=character')
    expect(joinedGuidance).toContain('joint records do not prove skin weights')
    expect(joinedGuidance).toContain('Z up, not Y up')
    expect(joinedGuidance).toContain('degrees, never radians')
    expect(joinedGuidance).toContain('declare semantics with pivot')
    expect(joinedGuidance).toContain('select a pixel or rectangular region')
    expect(definition?.name).toBe('illusion_build')
    expect(definition?.description).toContain('Z up')
    expect(definition?.parameters.type).toBe('object')
    const properties = definition?.parameters.properties as Record<string, PropertySchema>
    expect(properties.note?.maxLength).toBe(160)
    expect(properties.profile).toBeDefined()
    expect(properties.phase).toBeDefined()
    expect(properties.semantics).toBeDefined()

    const result = await definition!.execute({
      action: 'start',
      title: 'Bottle',
      operations: [{
        type: 'upsert',
        object: { id: 'body', geometry: { kind: 'cylinder', radius: 2, height: 8 } },
      }],
    }, { agent: {}, signal: new AbortController().signal })

    expect(result.snapshot.revision).toBe(1)
    expect(result.snapshot.steps).toHaveLength(1)
    expect(definition!.output.presentationMeta({}, result)).toEqual({ illusionSnapshot: result.snapshot })
    const art = definitions.get('illusion_art')
    expect(art?.description).toContain('pixel zoom')
    const artResult = await art!.execute({
      action: 'start', title: 'Wizard cast', phase: 'draft', frameWidth: 32, frameHeight: 32,
      frames: [{ id: 'ready', label: 'Ready', rects: [{ id: 'hat', x: 4, y: 2, width: 8, height: 4, fill: '#663399' }] }],
    }, { agent: {}, signal: new AbortController().signal })
    expect(artResult.snapshot.revision).toBe(1)
    expect(art!.output.presentationMeta({}, artResult)).toEqual({ illusionArtSnapshot: artResult.snapshot })
    expect(disposers).toHaveLength(4)
  })
})
