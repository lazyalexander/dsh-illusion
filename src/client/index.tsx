import React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'

import { BuildCard } from './BuildCard.js'
import { ArtCard, type ArtReviewSubmission } from './ArtCard.js'
import type { BuildStep } from '../protocol.js'
import { installIllusionHistoryVisibility } from './history.js'
import { getUiCopy, useUiLanguage } from './i18n.js'
import {
  createBranchPrompt,
  createHistoricalReviewPrompt,
  createReviewPrompt,
  type ReviewSubmission,
} from './review.js'
import { findBuildSnapshot } from './snapshot.js'
import { findArtSnapshot } from './snapshot.js'
import { createArtReviewPrompt } from './artReview.js'
import { createCreationModePrompt } from './creationMode.js'
import { styles } from './styles.js'

export const inject = ['fileUpload', 'sessions', 'slots', 'uiWorkspace']

type RemoteResult<T> = { readonly ok: true; readonly value: T } | {
  readonly ok: false
  readonly error: { readonly message?: string }
}

interface SubmissionSession {
  beginSubmission(input: {
    readonly mode: 'queue'
    readonly text: string
    readonly attachments: readonly unknown[]
  }): { readonly requestId: unknown; abandon(): void }
  prompt(
    content: readonly unknown[],
    mode: 'queue',
    signal?: AbortSignal,
    requestId?: unknown,
  ): Promise<RemoteResult<{ readonly accepted: true }>>
}

interface ClientServices {
  readonly fileUpload: {
    upload(
      sessionId: unknown,
      data: Blob,
      name?: string,
      signal?: AbortSignal,
    ): Promise<RemoteResult<{ readonly receiptId: unknown; readonly file: unknown }>>
  }
  readonly sessions: {
    binding(sessionId: unknown): { readonly session: SubmissionSession } | undefined
    fork(options: {
      readonly sessionId: unknown
      readonly atSeq: number
      readonly increaseTitle: boolean
    }): Promise<unknown>
    using<T>(
      sessionId: unknown,
      options: { readonly source: 'controllerOperation' },
      operation: (reference: {
        readonly ready: Promise<{ readonly session: SubmissionSession }>
        readonly binding: { readonly session: SubmissionSession }
      }) => T | Promise<T>,
    ): Promise<T>
  }
  readonly uiWorkspace: {
    openSession(sessionId: unknown): void
  }
}

async function submitPrompt(
  services: ClientServices,
  sessionId: unknown,
  text: string,
  files: readonly File[],
): Promise<void> {
  const send = async (session: SubmissionSession): Promise<void> => {
    const uploaded: { readonly receiptId: unknown; readonly file: unknown }[] = []
    for (const file of files) {
      const result = await services.fileUpload.upload(sessionId, file, file.name)
      if (!result.ok) throw new Error(result.error.message ?? 'reference upload failed')
      uploaded.push(result.value)
    }
    const submission = session.beginSubmission({
      mode: 'queue',
      text,
      attachments: uploaded.map((item) => ({ type: 'file', value: item.file })),
    })
    try {
      const result = await session.prompt([
        { type: 'text', text },
        ...uploaded.map((item) => ({ type: 'file', receiptId: item.receiptId })),
      ], 'queue', undefined, submission.requestId)
      if (!result.ok) throw new Error(result.error.message ?? 'review submission failed')
    } catch (error) {
      submission.abandon()
      throw error
    }
  }

  const binding = services.sessions.binding(sessionId)
  if (binding !== undefined) {
    await send(binding.session)
    return
  }
  await services.sessions.using(sessionId, { source: 'controllerOperation' }, async (reference) => {
    const ready = await reference.ready
    await send(ready.session)
  })
}

const DRAWING_MODE_STORAGE_PREFIX = 'dsh-illusion:drawing-mode:v1:'

function DrawingModeSwitch({ services, sessionId }: { readonly services: ClientServices; readonly sessionId: unknown }) {
  const [language] = useUiLanguage()
  const storageKey = `${DRAWING_MODE_STORAGE_PREFIX}${String(sessionId)}`
  const [enabled, setEnabled] = React.useState(() => {
    try {
      return window.localStorage.getItem(storageKey) === 'on'
    } catch {
      return false
    }
  })
  const [state, setState] = React.useState<'idle' | 'sending' | 'error'>('idle')
  const toggle = async (): Promise<void> => {
    if (state === 'sending') return
    const next = !enabled
    setState('sending')
    try {
      await submitPrompt(services, sessionId, createCreationModePrompt(next), [])
      setEnabled(next)
      try {
        window.localStorage.setItem(storageKey, next ? 'on' : 'off')
      } catch {
        // The accepted session instruction remains authoritative without persistence.
      }
      setState('idle')
    } catch {
      setState('error')
    }
  }
  const label = language === 'zh-CN' ? '绘画创作' : 'Drawing mode'
  const status = enabled ? (language === 'zh-CN' ? '开' : 'On') : (language === 'zh-CN' ? '关' : 'Off')
  return (
    <button
      aria-checked={enabled}
      className={`illusion-drawing-mode${enabled ? ' is-active' : ''}${state === 'error' ? ' is-error' : ''}`}
      disabled={state === 'sending'}
      onClick={() => void toggle()}
      role="switch"
      title={state === 'error' ? (language === 'zh-CN' ? '无法切换绘画创作模式' : 'Could not change drawing mode') : `${label}: ${status}`}
      type="button"
    >
      <span aria-hidden="true">🎨</span><b>{label}</b><i>{state === 'sending' ? '…' : status}</i>
    </button>
  )
}

function IllusionToolView(props: ToolCallViewProps & { readonly services: ClientServices }) {
  const [language] = useUiLanguage()
  if (props.phase !== 'result') return <div className="illusion-pending">{getUiCopy(language).pending}</div>
  const snapshot = findBuildSnapshot(props.block.meta)
  if (!snapshot) return <div className="illusion-pending">{getUiCopy(language).pending}</div>
  const sessionId = (props as unknown as { readonly sessionId: unknown }).sessionId
  const step = snapshot.steps[snapshot.activeStep]
  if (step === undefined) return <div className="illusion-pending">{getUiCopy(language).pending}</div>
  const review = async (submission: ReviewSubmission, selectedStep: BuildStep): Promise<void> => {
    if (selectedStep.index !== step.index) {
      const childId = await props.services.sessions.fork({
        sessionId,
        atSeq: props.block.seq,
        increaseTitle: true,
      })
      props.services.uiWorkspace.openSession(childId)
      await submitPrompt(
        props.services,
        childId,
        createHistoricalReviewPrompt(snapshot, selectedStep, submission.action, submission.text),
        submission.files,
      )
      return
    }
    await submitPrompt(
      props.services,
      sessionId,
      createReviewPrompt(snapshot, selectedStep, submission.action, submission.text),
      submission.files,
    )
  }
  const branch = async (selectedStep: BuildStep): Promise<void> => {
    const childId = await props.services.sessions.fork({
      sessionId,
      atSeq: props.block.seq,
      increaseTitle: true,
    })
    props.services.uiWorkspace.openSession(childId)
    await submitPrompt(props.services, childId, createBranchPrompt(snapshot, selectedStep), [])
  }
  return (
    <BuildCard
      key={`${snapshot.buildId}:${snapshot.revision}`}
      onBranch={branch}
      onReview={review}
      snapshot={snapshot}
    />
  )
}

function IllusionArtToolView(props: ToolCallViewProps & { readonly services: ClientServices }) {
  const [language] = useUiLanguage()
  if (props.phase !== 'result') return <div className="illusion-pending">{language === 'zh-CN' ? '正在发布 2D 美术步骤…' : 'Publishing 2D art step…'}</div>
  const snapshot = findArtSnapshot(props.block.meta)
  if (snapshot === undefined) return <div className="illusion-pending">{getUiCopy(language).pending}</div>
  const sessionId = (props as unknown as { readonly sessionId: unknown }).sessionId
  const review = async (submission: ArtReviewSubmission): Promise<void> => {
    await submitPrompt(props.services, sessionId, createArtReviewPrompt(snapshot, submission), submission.files)
  }
  return <ArtCard key={`${snapshot.artId}:${snapshot.revision}`} onReview={review} snapshot={snapshot} />
}

export function apply(ctx: Context): void {
  const services = ctx as Context & ClientServices
  ctx.effect(() => {
    const element = document.createElement('style')
    element.dataset.plugin = 'dsh-illusion'
    element.textContent = styles
    document.head.append(element)
    return () => element.remove()
  }, 'dsh-illusion: styles')

  ctx.effect(installIllusionHistoryVisibility, 'dsh-illusion: visible history')

  const slots = (ctx as Context & {
    slots: {
      inject(name: string, register: () => unknown): () => void
      register<Props>(meta: Record<string, unknown>, component: React.ComponentType<Props>): () => void
    }
  }).slots

  const View = (props: ToolCallViewProps) => <IllusionToolView {...props} services={services} />
  const ArtView = (props: ToolCallViewProps) => <IllusionArtToolView {...props} services={services} />
  const DrawingMode = (props: { readonly sessionId: unknown }) => <DrawingModeSwitch services={services} sessionId={props.sessionId} />

  slots.inject('tool.call.toolview', () => slots.register({
    name: 'tool.call.toolview',
    key: 'illusion_build',
  }, View))
  slots.inject('tool.call.toolview', () => slots.register({
    name: 'tool.call.toolview',
    key: 'illusion_art',
  }, ArtView))
  slots.inject('conversation.input.left', () => slots.register({
    name: 'conversation.input.left',
    id: 'dsh-illusion-drawing-mode',
    order: 80,
    label: 'Illusion drawing creation mode',
  }, DrawingMode))
}
