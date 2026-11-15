import type { BuildSnapshot } from '../protocol.js'
import type { ArtSnapshot } from '../art/protocol.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function findArtSnapshot(root: unknown): ArtSnapshot | undefined {
  const visited = new WeakSet<object>()
  function visit(value: unknown, depth: number): ArtSnapshot | undefined {
    if (depth > 7) return undefined
    if (isRecord(value)
      && value.protocol === 1
      && typeof value.artId === 'string'
      && typeof value.title === 'string'
      && Array.isArray(value.steps)) return value as unknown as ArtSnapshot
    if (!isRecord(value) && !Array.isArray(value)) return undefined
    if (visited.has(value)) return undefined
    visited.add(value)
    if (isRecord(value) && 'illusionArtSnapshot' in value) {
      const direct = visit(value.illusionArtSnapshot, depth + 1)
      if (direct !== undefined) return direct
    }
    for (const child of Array.isArray(value) ? value : Object.values(value)) {
      const found = visit(child, depth + 1)
      if (found !== undefined) return found
    }
    return undefined
  }
  return visit(root, 0)
}

export function isBuildSnapshot(value: unknown): value is BuildSnapshot {
  if (!isRecord(value)) return false
  return (value.protocol === 1 || value.protocol === 2)
    && typeof value.buildId === 'string'
    && typeof value.title === 'string'
    && (value.status === 'building' || value.status === 'complete')
    && typeof value.revision === 'number'
    && typeof value.activeStep === 'number'
    && Array.isArray(value.steps)
}

export function findBuildSnapshot(root: unknown): BuildSnapshot | undefined {
  const visited = new WeakSet<object>()

  function visit(value: unknown, depth: number): BuildSnapshot | undefined {
    if (depth > 7) return undefined
    if (isBuildSnapshot(value)) return value
    if (typeof value === 'string' && value.length < 1_000_000 && value.includes('"protocol"')) {
      try {
        const parsed: unknown = JSON.parse(value)
        return visit(parsed, depth + 1)
      } catch {
        return undefined
      }
    }
    if (!isRecord(value) && !Array.isArray(value)) return undefined
    if (visited.has(value)) return undefined
    visited.add(value)

    if (isRecord(value) && 'illusionSnapshot' in value) {
      const direct = visit(value.illusionSnapshot, depth + 1)
      if (direct) return direct
    }
    for (const child of Array.isArray(value) ? value : Object.values(value)) {
      const found = visit(child, depth + 1)
      if (found) return found
    }
    return undefined
  }

  return visit(root, 0)
}
