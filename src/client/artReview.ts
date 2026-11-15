import type { ArtSnapshot } from '../art/protocol.js'
import type { ArtReviewSubmission } from './ArtCard.js'

export function createArtReviewPrompt(snapshot: ArtSnapshot, submission: ArtReviewSubmission): string {
  const step = snapshot.steps[snapshot.activeStep]
  if (step === undefined) throw new RangeError('art review step is unavailable')
  const focus = submission.focus
  const target = focus === undefined
    ? 'the selected frame as a whole'
    : `frame ${focus.frameIndex + 1} (${focus.frameId})${focus.objectId === undefined ? '' : `, object ${focus.objectId} (${focus.objectLabel ?? focus.objectId})`}, pixel region x=${focus.x}, y=${focus.y}, width=${focus.width}, height=${focus.height}`
  return [
    `Illusion 2D checkpoint: art ${snapshot.artId}, revision ${step.index}, target ${target}.`,
    `Editor feedback: ${submission.text.trim() || 'Use the attached reference files as the correction direction.'}`,
    ...(submission.editorReference === undefined ? [] : [
      `The attached PNG and dsh-illusion/editor-patch@1 JSON are the editor-saved authoritative reference for frame ${submission.editorReference.frameId}.`,
      `It contains ${submission.editorReference.editCount} explicit pixel edits with patch SHA-256 ${submission.editorReference.digest}. Reproduce those edits exactly before interpreting any additional prose.`,
    ]),
    'Call illusion_art exactly once with action="apply" and publish one correction step.',
    'Keep the same frame dimensions, stable frame IDs, frame order, palette, and all content outside the named target unchanged unless the feedback explicitly requests otherwise.',
    'Preserve stable composition object IDs and zIndex. Do not change locked objects unless the editor explicitly asks to unlock them.',
    'After publishing, stop and ask whether the corrected frame now matches the expectation.',
  ].join(' ')
}
