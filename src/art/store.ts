import { ART_LIMITS, type ArtCommand, type ArtSnapshot, type ArtStep } from './protocol.js'

export class ArtStore {
  readonly #createId: () => string
  #artId = ''
  #title = ''
  #revision = 0
  #status: ArtSnapshot['status'] = 'building'
  #steps: ArtStep[] = []

  constructor(createId: () => string = () => `illusion-art-${Date.now().toString(36)}`) {
    this.#createId = createId
  }

  apply(command: ArtCommand): ArtSnapshot {
    if (command.action === 'start' || this.#artId.length === 0) {
      this.#artId = this.#createId()
      this.#title = command.title
      this.#revision = 0
      this.#status = 'building'
      this.#steps = []
    }
    if (this.#status === 'complete' && command.action === 'complete') throw new Error('art production is already complete')
    this.#revision += 1
    this.#status = command.action === 'complete' ? 'complete' : 'building'
    this.#steps.push(structuredClone({ ...command, index: this.#revision, status: this.#status }))
    if (this.#steps.length > ART_LIMITS.steps) this.#steps.shift()
    return this.snapshot()
  }

  snapshot(): ArtSnapshot {
    return structuredClone({
      protocol: 1 as const,
      artId: this.#artId,
      title: this.#title,
      status: this.#status,
      revision: this.#revision,
      activeStep: Math.max(0, this.#steps.length - 1),
      steps: this.#steps,
    })
  }
}
