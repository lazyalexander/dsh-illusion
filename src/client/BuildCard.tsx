import { useEffect, useMemo, useRef, useState } from 'react'

import type { BuildSnapshot, BuildStep } from '../protocol.js'
import { materializeBuildScene } from '../scene.js'
import { downloadBuildRecord, downloadStepGlb } from './export.js'
import {
  getPhaseLabel,
  getGameAssetLabel,
  getStepTitle,
  getStyleLabel,
  getTargetLabel,
  getUiCopy,
  useUiLanguage,
} from './i18n.js'
import { SceneViewport } from './SceneViewport.js'
import type { ReviewAction, ReviewSubmission } from './review.js'
import {
  loadStepThoughts,
  saveStepThoughts,
  STEP_THOUGHT_LIMIT,
  updateStepThought,
} from './thoughts.js'

interface BuildCardProps {
  readonly snapshot: BuildSnapshot
  readonly onBranch?: (step: BuildStep) => Promise<void>
  readonly onReview?: (submission: ReviewSubmission, step: BuildStep) => Promise<void>
}

export function BuildCard({ snapshot, onBranch, onReview }: BuildCardProps) {
  const [language, setLanguage] = useUiLanguage()
  const ui = getUiCopy(language)
  const [thoughts, setThoughts] = useState(() => loadStepThoughts(snapshot.buildId))
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'error'>('idle')
  const [reviewFiles, setReviewFiles] = useState<readonly File[]>([])
  const [reviewState, setReviewState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [branchState, setBranchState] = useState<'idle' | 'branching' | 'error'>('idle')
  const fileInput = useRef<HTMLInputElement>(null)
  const stepIndex = snapshot.activeStep
  const step = snapshot.steps[stepIndex]
  const scene = useMemo(() => materializeBuildScene(snapshot, stepIndex), [snapshot, stepIndex])
  const objects = scene.objects
  const joints = scene.joints
  const semantics = scene.semantics
  const status = step?.status ?? snapshot.status
  const thought = step === undefined ? '' : thoughts[String(step.index)]?.text ?? ''

  useEffect(() => {
    setThoughts(loadStepThoughts(snapshot.buildId))
  }, [snapshot.buildId])

  const changeThought = (text: string): void => {
    if (step === undefined) return
    setReviewState('idle')
    const next = updateStepThought(thoughts, step.index, text)
    setThoughts(next)
    setStorageAvailable(saveStepThoughts(snapshot.buildId, next))
  }

  const exportGlb = async (): Promise<void> => {
    if (step === undefined || exportState === 'exporting') return
    setExportState('exporting')
    try {
      await downloadStepGlb(snapshot, stepIndex)
      setExportState('idle')
    } catch {
      setExportState('error')
    }
  }

  const submitReview = async (action: ReviewAction): Promise<void> => {
    if (step === undefined || onReview === undefined || reviewState === 'sending') return
    setReviewState('sending')
    try {
      await onReview({ action, text: thought, files: action === 'adjust' ? reviewFiles : [] }, step)
      setReviewState('sent')
      setReviewFiles([])
      if (fileInput.current !== null) fileInput.current.value = ''
    } catch {
      setReviewState('error')
    }
  }

  const branch = async (): Promise<void> => {
    if (step === undefined || onBranch === undefined || branchState === 'branching') return
    setBranchState('branching')
    try {
      await onBranch(step)
    } catch {
      setBranchState('error')
    }
  }

  return (
    <section className="illusion-card">
      <header className="illusion-header">
        <div>
          <span className="illusion-kicker">
            {snapshot.profile?.kind === 'character'
              ? ui.characterBuild
              : snapshot.profile?.kind === 'game-asset'
                ? ui.gameAssetBuild
                : ui.liveBuild}
          </span>
          <h3>{step === undefined ? snapshot.title : getStepTitle(step, language)}</h3>
          <div className="illusion-build-meta">
            <span>{getPhaseLabel(step?.phase, language)}</span>
            {snapshot.profile?.kind === 'character' ? (
              <span>{getStyleLabel(snapshot.profile.style, language)} · {getTargetLabel(snapshot.profile.target, language)}</span>
            ) : snapshot.profile?.kind === 'game-asset' ? (
              <span>{getGameAssetLabel(snapshot.profile, language)}</span>
            ) : null}
          </div>
        </div>
        <div className="illusion-header-actions">
          <div aria-label={ui.language} className="illusion-language" role="group">
            <button aria-pressed={language === 'en'} onClick={() => setLanguage('en')} type="button">EN</button>
            <button aria-pressed={language === 'zh-CN'} onClick={() => setLanguage('zh-CN')} type="button">中文</button>
          </div>
          <button disabled={step === undefined || exportState === 'exporting'} onClick={() => void exportGlb()} type="button">
            {exportState === 'exporting' ? ui.exporting : ui.exportStep}
          </button>
          <button onClick={() => downloadBuildRecord(snapshot, thoughts, step?.index ?? 0)} type="button">
            {ui.exportBuild}
          </button>
          <button disabled={step === undefined || onBranch === undefined || branchState === 'branching'} onClick={() => void branch()} type="button">
            {branchState === 'branching' ? ui.branching : ui.branchFromStep}
          </button>
          <span className={`illusion-status illusion-status--${status}`}>
            {status === 'complete' ? ui.complete : ui.building}
          </span>
        </div>
      </header>

      <div className="illusion-stage">
        <SceneViewport ariaLabel={ui.viewportLabel} deferredLabel={ui.viewportDeferred} joints={joints} objects={objects} />
        <aside className="illusion-timeline">
          <div className="illusion-thought">
            <strong>{ui.isExpected}</strong>
            <p>{ui.reviewHelp}</p>
            <label htmlFor={`illusion-thought-${snapshot.buildId}-${step?.index ?? 0}`}>{ui.latestThought}</label>
            <textarea
              id={`illusion-thought-${snapshot.buildId}-${step?.index ?? 0}`}
              maxLength={STEP_THOUGHT_LIMIT}
              onChange={(event) => changeThought(event.currentTarget.value)}
              placeholder={ui.adjustPlaceholder}
              value={thought}
            />
            <small>
              {storageAvailable ? ui.thoughtSaved : ui.thoughtUnavailable}
            </small>
          </div>
          {step !== undefined ? (
            <div className="illusion-review">
              <div className="illusion-review-files">
                <label>
                  {ui.addReferences}
                  <input
                    multiple
                    onChange={(event) => {
                      setReviewFiles(Array.from(event.currentTarget.files ?? []))
                      setReviewState('idle')
                    }}
                    ref={fileInput}
                    type="file"
                  />
                </label>
                {reviewFiles.length > 0 ? <span>{reviewFiles.map((file) => file.name).join(', ')}</span> : null}
              </div>
              <div className="illusion-review-actions">
                <button disabled={onReview === undefined || reviewState === 'sending'} onClick={() => void submitReview('continue')} type="button">
                  {ui.acceptContinue}
                </button>
                <button
                  disabled={onReview === undefined || reviewState === 'sending' || (thought.trim().length === 0 && reviewFiles.length === 0)}
                  onClick={() => void submitReview('adjust')}
                  type="button"
                >
                  {ui.sendAdjustment}
                </button>
                <button disabled={onReview === undefined || reviewState === 'sending'} onClick={() => void submitReview('plan')} type="button">
                  {ui.runPlan}
                </button>
                <button disabled={onReview === undefined || reviewState === 'sending'} onClick={() => void submitReview('finish')} type="button">
                  {ui.finishBuild}
                </button>
              </div>
              {reviewState === 'sent' ? <small>{ui.reviewSent}</small> : null}
              {reviewState === 'error' ? <small className="illusion-export-error">{ui.reviewFailed}</small> : null}
              {branchState === 'error' ? <small className="illusion-export-error">{ui.branchFailed}</small> : null}
            </div>
          ) : null}
        </aside>
      </div>

      <footer className="illusion-footer">
        <span>{getPhaseLabel(step?.phase, language)}</span>
        <span>{objects.length} {objects.length === 1 ? ui.part : ui.parts}</span>
        {joints.length > 0 ? <span>{joints.length} {joints.length === 1 ? ui.joint : ui.joints}</span> : null}
        {(semantics?.sockets.length ?? 0) > 0 ? <span>{semantics?.sockets.length} {ui.sockets}</span> : null}
        {(semantics?.colliders.length ?? 0) > 0 ? <span>{semantics?.colliders.length} {ui.colliders}</span> : null}
        {(semantics?.lodGroups.length ?? 0) > 0 ? <span>{semantics?.lodGroups.length} {ui.lodGroups}</span> : null}
        {exportState === 'error' ? <span className="illusion-export-error">{ui.exportFailed}</span> : null}
        <span>{ui.viewportHelp}</span>
      </footer>
    </section>
  )
}
