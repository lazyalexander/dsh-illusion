import type { BuildSnapshot, BuildStep } from '../protocol.js'

export type ReviewAction = 'continue' | 'adjust' | 'plan' | 'finish'

export interface ReviewSubmission {
  readonly action: ReviewAction
  readonly text: string
  readonly files: readonly File[]
}

export function createReviewPrompt(
  snapshot: BuildSnapshot,
  step: BuildStep,
  action: ReviewAction,
  feedback: string,
): string {
  const checkpoint = `Illusion checkpoint: build ${snapshot.buildId}, step ${step.index} (${step.title}).`
  if (action === 'continue') {
    return `${checkpoint} This step matches my expectation. Create exactly one next visible construction step with stable semantic IDs, then stop and ask for review again. Do not complete the build unless I explicitly request it.`
  }
  if (action === 'plan') {
    const target = feedback.trim()
    return [
      checkpoint,
      'This checkpoint is accepted. Enter Plan execution mode.',
      `Choose coherent semantic construction nodes and run ${target.length > 0 ? `toward this target: ${target}` : 'to the most useful next review node or the finished model, as modeling judgment requires'}.`,
      'Publish every plan node through its own illusion_build call so every intermediate state remains visible, editable, exportable, and branchable in chat history.',
      'Do not merge multiple semantic nodes into one call. Stop at the chosen target or completed model and ask for review.',
    ].join(' ')
  }
  if (action === 'finish') {
    return `${checkpoint} Finish from this accepted checkpoint. Create exactly one validation or completion step, call complete only if validation passes, then stop and report the result.`
  }
  const direction = feedback.trim()
  return `${checkpoint} Revise this checkpoint without starting over. Use the attached references and this direction: ${direction || 'Use the attached reference files as the refinement direction.'} Reuse stable semantic IDs, publish exactly one correction step, then stop and ask whether it now matches my expectation.`
}

export function createBranchPrompt(snapshot: BuildSnapshot, step: BuildStep): string {
  return [
    `Resume the Illusion build from live checkpoint ${snapshot.buildId}, step ${step.index}.`,
    'Call illusion_build exactly once with action="resume",',
    `sourceBuildId="${snapshot.buildId}", sourceStep=${step.index},`,
    `title="Branch from ${step.title}", phase="${step.phase ?? 'assembly'}", and no operations.`,
    'Provide translations.zh-CN, then stop and ask whether this branch point is the expected starting state.',
  ].join(' ')
}

export function createHistoricalReviewPrompt(
  snapshot: BuildSnapshot,
  step: BuildStep,
  action: ReviewAction,
  feedback: string,
): string {
  return [
    `Create a live branch from Illusion checkpoint ${snapshot.buildId}, step ${step.index} (${step.title}).`,
    'First call illusion_build exactly once with action="resume",',
    `sourceBuildId="${snapshot.buildId}", sourceStep=${step.index},`,
    `title="Branch from ${step.title}", phase="${step.phase ?? 'assembly'}", no operations, and translations.zh-CN.`,
    'Do not stop after resuming.',
    createReviewPrompt(snapshot, step, action, feedback),
    'Apply the requested work to the resumed branch, never to a later source step.',
  ].join(' ')
}
