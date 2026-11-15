export function createCreationModePrompt(enabled: boolean): string {
  if (enabled) {
    return [
      '[Illusion drawing mode: ON]',
      'Enter 2D drawing creation mode for my subsequent visual requests.',
      'Use illusion_art to publish reviewable 2D checkpoints with exact canvas or frame dimensions, semantic composition objects, and stable IDs.',
      'In interactive work publish one checkpoint, stop, and ask whether it matches my expectation. Do not reinterpret unrelated non-visual requests as drawing tasks.',
    ].join(' ')
  }
  return [
    '[Illusion drawing mode: OFF]',
    'Exit 2D drawing creation mode.',
    'Do not infer that subsequent requests are drawing tasks and do not call illusion_art unless I explicitly ask for 2D art.',
  ].join(' ')
}
