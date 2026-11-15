const CARD_SELECTOR = '.illusion-card'
const PROCESS_SELECTOR = '[data-step-process]'

function openButton(button: HTMLButtonElement | null): void {
  if (button?.getAttribute('aria-expanded') === 'false') button.click()
}

export function revealIllusionHistory(root: ParentNode = document): void {
  for (const card of root.querySelectorAll<HTMLElement>(CARD_SELECTOR)) {
    const process = card.closest<HTMLElement>(PROCESS_SELECTOR)
    if (process === null) continue
    process.dataset.illusionHistory = 'true'

    const turn = process.dataset.chatTurn
    if (turn !== undefined) {
      const escapedTurn = CSS.escape(turn)
      openButton(document.querySelector<HTMLButtonElement>(`button[data-turn-process="${escapedTurn}"]`))
    }

    openButton(process.querySelector<HTMLButtonElement>(':scope > div button[aria-expanded]'))
  }
}

export function installIllusionHistoryVisibility(): () => void {
  let scheduled = false
  const reveal = (): void => {
    if (scheduled) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      revealIllusionHistory()
    })
  }
  const observer = new MutationObserver(reveal)
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['aria-expanded', 'hidden'],
    childList: true,
    subtree: true,
  })
  reveal()
  return () => observer.disconnect()
}
