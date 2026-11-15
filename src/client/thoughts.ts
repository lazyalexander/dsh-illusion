export const STEP_THOUGHT_LIMIT = 2_000

export interface StepThought {
  readonly text: string
  readonly updatedAt: string
}

export type StepThoughts = Readonly<Record<string, StepThought>>

function storageKey(buildId: string): string {
  return `dsh-illusion:step-thoughts:v1:${buildId}`
}

function normalize(value: unknown): StepThoughts {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const thoughts: Record<string, StepThought> = {}
  for (const [step, entry] of Object.entries(value)) {
    if (!/^\d+$/.test(step) || typeof entry !== 'object' || entry === null || Array.isArray(entry)) continue
    const candidate = entry as Record<string, unknown>
    if (typeof candidate.text !== 'string' || typeof candidate.updatedAt !== 'string') continue
    thoughts[step] = {
      text: candidate.text.slice(0, STEP_THOUGHT_LIMIT),
      updatedAt: candidate.updatedAt,
    }
  }
  return thoughts
}

export function loadStepThoughts(buildId: string): StepThoughts {
  try {
    const stored = window.localStorage.getItem(storageKey(buildId))
    return stored === null ? {} : normalize(JSON.parse(stored))
  } catch {
    return {}
  }
}

export function saveStepThoughts(buildId: string, thoughts: StepThoughts): boolean {
  try {
    window.localStorage.setItem(storageKey(buildId), JSON.stringify(thoughts))
    return true
  } catch {
    return false
  }
}

export function updateStepThought(
  thoughts: StepThoughts,
  stepIndex: number,
  text: string,
  updatedAt = new Date().toISOString(),
): StepThoughts {
  return {
    ...thoughts,
    [String(stepIndex)]: {
      text: text.slice(0, STEP_THOUGHT_LIMIT),
      updatedAt,
    },
  }
}
