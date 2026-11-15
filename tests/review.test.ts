import { describe, expect, it } from 'vitest'

import { createBranchPrompt, createHistoricalReviewPrompt, createReviewPrompt } from '../src/client/review.js'
import type { BuildSnapshot, BuildStep } from '../src/protocol.js'

const step: BuildStep = {
  index: 4,
  title: 'Turret blockout',
  phase: 'assembly',
  status: 'building',
}

const snapshot: BuildSnapshot = {
  protocol: 2,
  buildId: 'tank-build',
  title: 'Tank',
  status: 'building',
  revision: 4,
  activeStep: 3,
  steps: [step],
}

describe('checkpoint review prompts', () => {
  it('keeps interactive correction boundaries explicit', () => {
    expect(createReviewPrompt(snapshot, step, 'continue', '')).toContain('exactly one next visible construction step')
    expect(createReviewPrompt(snapshot, step, 'adjust', 'Lower the turret.')).toContain('Lower the turret.')
    expect(createReviewPrompt(snapshot, step, 'adjust', '')).toContain('attached reference files')
    expect(createReviewPrompt(snapshot, step, 'finish', '')).toContain('call complete only if validation passes')
  })

  it('keeps every plan node independently publishable', () => {
    const prompt = createReviewPrompt(snapshot, step, 'plan', 'pressure hull complete')
    expect(prompt).toContain('toward this target: pressure hull complete')
    expect(prompt).toContain('every plan node through its own illusion_build call')
    expect(prompt).toContain('branchable in chat history')
  })

  it('creates a precise resumable branch request', () => {
    const prompt = createBranchPrompt(snapshot, step)
    expect(prompt).toContain('sourceBuildId="tank-build"')
    expect(prompt).toContain('sourceStep=4')
    expect(prompt).toContain('exactly once')
  })

  it('resumes a historical checkpoint before changing it', () => {
    const prompt = createHistoricalReviewPrompt(snapshot, step, 'adjust', 'Move the hatch aft.')
    expect(prompt).toContain('First call illusion_build exactly once with action="resume"')
    expect(prompt).toContain('sourceStep=4')
    expect(prompt).toContain('Do not stop after resuming')
    expect(prompt).toContain('Move the hatch aft.')
  })
})
