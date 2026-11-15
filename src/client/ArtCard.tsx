import { useEffect, useMemo, useRef, useState } from 'react'

import type { ArtFrame, ArtObject, ArtRect, ArtSnapshot } from '../art/protocol.js'
import type { UiLocale } from '../protocol.js'
import { useUiLanguage } from './i18n.js'
import {
  applyPixelEdits,
  createEditorPatch,
  orderedFrameRects,
  parsePixelKey,
  pixelKey,
  rasterizeFrame,
  type PixelEdits,
} from './pixelEditor.js'

export interface ArtFocus {
  readonly frameId: string
  readonly frameIndex: number
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly objectId?: string
  readonly objectLabel?: string
}

export interface ArtReviewSubmission {
  readonly text: string
  readonly files: readonly File[]
  readonly focus?: ArtFocus
  readonly editorReference?: {
    readonly frameId: string
    readonly editCount: number
    readonly digest: string
  }
}

interface ArtCardProps {
  readonly snapshot: ArtSnapshot
  readonly onReview?: (submission: ArtReviewSubmission) => Promise<void>
}

const copy = {
  en: {
    kicker: 'ILLUSION · 2D FRAME REVIEW', frames: 'Frames', zoom: 'Pixel zoom',
    objects: 'Composition objects', locked: 'locked',
    selectTool: 'Select', pencil: 'Pencil', eraser: 'Eraser', eyedropper: 'Pick color', undo: 'Undo', redo: 'Redo',
    saveReference: 'Save as iteration reference', referenceSaved: 'Editor reference saved locally', referenceDirty: 'Save edits before submitting',
    select: 'Drag on the enlarged frame to mark the exact area that is wrong.', clear: 'Clear selection',
    focus: 'Selected area', thought: 'Describe what is wrong here and what must stay unchanged.',
    files: 'Add reference files', send: 'Adjust selected area', sent: 'Sent to DeepSeek',
    exportFrame: 'Export frame SVG', exportRecord: 'Export art JSON', expected: 'Is this frame what you expected?',
  },
  'zh-CN': {
    kicker: 'ILLUSION · 2D 逐帧审查', frames: '动作帧', zoom: '像素放大',
    objects: '构图对象', locked: '已锁定',
    selectTool: '框选', pencil: '画笔', eraser: '橡皮', eyedropper: '取色', undo: '撤销', redo: '重做',
    saveReference: '保存并作为迭代参照', referenceSaved: '编辑者参照已保存在本地', referenceDirty: '请先保存编辑内容',
    select: '在放大的画面上拖拽，框出具体不对的区域。', clear: '清除选区',
    focus: '已选区域', thought: '说明这里哪里不对，以及哪些部分必须保持不变。',
    files: '添加参考文件', send: '微调所选区域', sent: '已发送给 DeepSeek',
    exportFrame: '导出当前帧 SVG', exportRecord: '导出完整美术 JSON', expected: '这一帧符合你的预期吗？',
  },
} as const

function frameLabel(frame: ArtFrame, language: UiLocale): string {
  return frame.translations?.[language]?.title ?? frame.label
}

function download(name: string, type: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

function frameSvg(frame: ArtFrame, width: number, height: number): string {
  const rects = allRects(frame).map((rect) => `<rect id="${rect.id}" x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="${rect.fill}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${rects}</svg>`
}

function orderedObjects(frame: ArtFrame): readonly ArtObject[] {
  return [...(frame.objects ?? [])].sort((a, b) => a.zIndex - b.zIndex)
}

function allRects(frame: ArtFrame): readonly ArtRect[] {
  return orderedFrameRects(frame)
}

function objectBounds(object: ArtObject): { x: number; y: number; width: number; height: number } {
  const x = Math.min(...object.rects.map((rect) => rect.x))
  const y = Math.min(...object.rects.map((rect) => rect.y))
  const right = Math.max(...object.rects.map((rect) => rect.x + rect.width))
  const bottom = Math.max(...object.rects.map((rect) => rect.y + rect.height))
  return { x, y, width: right - x, height: bottom - y }
}

type EditorTool = 'select' | 'pencil' | 'eraser' | 'eyedropper'

interface SavedEditorReference {
  readonly frameId: string
  readonly editCount: number
  readonly digest: string
  readonly files: readonly File[]
}

function pixelStorageKey(artId: string, stepIndex: number, frameId: string): string {
  return `dsh-illusion:pixel-edits:v1:${artId}:${stepIndex}:${frameId}`
}

function loadPixelEdits(key: string): PixelEdits {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? '{}')
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return Object.fromEntries(Object.entries(parsed).filter(([pixel, color]) => /^\d+,\d+$/.test(pixel) && (color === null || (typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)))))
    }
  } catch {
    // An unavailable or invalid local draft starts empty.
  }
  return {}
}

function persistPixelEdits(key: string, edits: PixelEdits): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(edits))
    return true
  } catch {
    return false
  }
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function pngFile(frame: ArtFrame, width: number, height: number, edits: PixelEdits): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (context === null) return Promise.reject(new Error('2D canvas is unavailable'))
  context.imageSmoothingEnabled = false
  const pixels = applyPixelEdits(rasterizeFrame(frame, width, height), edits, width, height)
  pixels.forEach((color, index) => {
    if (color === null) return
    context.fillStyle = color
    context.fillRect(index % width, Math.floor(index / width), 1, 1)
  })
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (blob === null) reject(new Error('PNG encoding failed'))
    else resolve(new File([blob], `${frame.id}-editor-reference.png`, { type: 'image/png' }))
  }, 'image/png'))
}

export function ArtCard({ snapshot, onReview }: ArtCardProps) {
  const [language] = useUiLanguage()
  const ui = copy[language]
  const step = snapshot.steps[snapshot.activeStep]
  const [frameIndex, setFrameIndex] = useState(0)
  const frame = step?.frames[Math.min(frameIndex, Math.max(step.frames.length - 1, 0))]
  const [zoom, setZoom] = useState(12)
  const [tool, setTool] = useState<EditorTool>('select')
  const [paintColor, setPaintColor] = useState('#ffffff')
  const [edits, setEdits] = useState<PixelEdits>({})
  const [undoStack, setUndoStack] = useState<readonly PixelEdits[]>([])
  const [redoStack, setRedoStack] = useState<readonly PixelEdits[]>([])
  const [drawing, setDrawing] = useState(false)
  const [editorDirty, setEditorDirty] = useState(false)
  const [editorStorageAvailable, setEditorStorageAvailable] = useState(true)
  const [savedReference, setSavedReference] = useState<SavedEditorReference>()
  const [start, setStart] = useState<{ x: number; y: number }>()
  const [focus, setFocus] = useState<ArtFocus>()
  const [selectedObjectId, setSelectedObjectId] = useState<string>()
  const [text, setText] = useState('')
  const [files, setFiles] = useState<readonly File[]>([])
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const fileInput = useRef<HTMLInputElement>(null)
  const editsRef = useRef<PixelEdits>({})
  const dimensions = useMemo(() => ({ width: step?.frameWidth ?? 1, height: step?.frameHeight ?? 1 }), [step])
  const editStorageKey = step === undefined || frame === undefined ? '' : pixelStorageKey(snapshot.artId, step.index, frame.id)
  const editedPixels = useMemo(() => frame === undefined
    ? []
    : applyPixelEdits(rasterizeFrame(frame, dimensions.width, dimensions.height), edits, dimensions.width, dimensions.height),
  [dimensions.height, dimensions.width, edits, frame])

  useEffect(() => {
    if (editStorageKey.length === 0) return
    const loaded = loadPixelEdits(editStorageKey)
    editsRef.current = loaded
    setEdits(loaded)
    setUndoStack([])
    setRedoStack([])
    setSavedReference(undefined)
    setEditorDirty(Object.keys(loaded).length > 0)
  }, [editStorageKey])

  const coordinate = (event: React.PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(dimensions.width - 1, Math.floor((event.clientX - bounds.left) / bounds.width * dimensions.width))),
      y: Math.max(0, Math.min(dimensions.height - 1, Math.floor((event.clientY - bounds.top) / bounds.height * dimensions.height))),
    }
  }

  const finishSelection = (event: React.PointerEvent<SVGSVGElement>): void => {
    if (frame === undefined || start === undefined) return
    const end = coordinate(event)
    const x = Math.min(start.x, end.x)
    const y = Math.min(start.y, end.y)
    const selectedObject = [...orderedObjects(frame)].reverse().find((object) => object.rects.some((rect) => end.x >= rect.x && end.x < rect.x + rect.width && end.y >= rect.y && end.y < rect.y + rect.height))
    setSelectedObjectId(selectedObject?.id)
    setFocus({
      frameId: frame.id, frameIndex, x, y, width: Math.abs(start.x - end.x) + 1, height: Math.abs(start.y - end.y) + 1,
      ...(selectedObject === undefined ? {} : { objectId: selectedObject.id, objectLabel: selectedObject.label }),
    })
    setStart(undefined)
    setState('idle')
  }

  const saveEdits = (next: PixelEdits): void => {
    editsRef.current = next
    setEdits(next)
    setEditorStorageAvailable(persistPixelEdits(editStorageKey, next))
    setEditorDirty(true)
    setSavedReference(undefined)
    setState('idle')
  }

  const editPixel = (x: number, y: number): void => {
    if (frame === undefined || (tool !== 'pencil' && tool !== 'eraser')) return
    const topObject = [...orderedObjects(frame)].reverse().find((object) => object.rects.some((rect) => x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height))
    if (topObject?.locked === true) return
    const value = tool === 'eraser' ? null : paintColor.toLowerCase()
    const key = pixelKey(x, y)
    const current = editsRef.current
    if (current[key] === value) return
    saveEdits({ ...current, [key]: value })
  }

  const beginCanvasAction = (event: React.PointerEvent<SVGSVGElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = coordinate(event)
    if (tool === 'select') {
      setStart(point)
      return
    }
    if (tool === 'eyedropper') {
      const color = editedPixels[point.y * dimensions.width + point.x]
      if (color !== null && color !== undefined) setPaintColor(color)
      setTool('pencil')
      return
    }
    setUndoStack((stack) => [...stack, editsRef.current].slice(-100))
    setRedoStack([])
    setDrawing(true)
    editPixel(point.x, point.y)
  }

  const moveCanvasAction = (event: React.PointerEvent<SVGSVGElement>): void => {
    if (!drawing || (tool !== 'pencil' && tool !== 'eraser')) return
    const point = coordinate(event)
    editPixel(point.x, point.y)
  }

  const undo = (): void => {
    const previous = undoStack.at(-1)
    if (previous === undefined) return
    setUndoStack(undoStack.slice(0, -1))
    setRedoStack((stack) => [...stack, editsRef.current].slice(-100))
    saveEdits(previous)
  }

  const redo = (): void => {
    const next = redoStack.at(-1)
    if (next === undefined) return
    setRedoStack(redoStack.slice(0, -1))
    setUndoStack((stack) => [...stack, editsRef.current].slice(-100))
    saveEdits(next)
  }

  const saveReference = async (): Promise<void> => {
    if (frame === undefined || step === undefined || Object.keys(edits).length === 0) return
    try {
      const patch = createEditorPatch(snapshot.artId, frame.id, step.frameWidth, step.frameHeight, edits)
      const patchText = JSON.stringify(patch, null, 2)
      const [image, digest] = await Promise.all([
        pngFile(frame, step.frameWidth, step.frameHeight, edits),
        sha256(patchText),
      ])
      const patchFile = new File([patchText], `${frame.id}-editor-patch.json`, { type: 'application/json' })
      setSavedReference({ frameId: frame.id, editCount: patch.edits.length, digest, files: [image, patchFile] })
      setEditorDirty(false)
      setState('idle')
    } catch {
      setState('error')
    }
  }

  const submit = async (): Promise<void> => {
    if (onReview === undefined || state === 'sending' || frame === undefined || editorDirty || (text.trim().length === 0 && files.length === 0 && savedReference === undefined)) return
    setState('sending')
    try {
      await onReview({
        text,
        files: [...files, ...(savedReference?.files ?? [])],
        ...(focus === undefined ? {} : { focus }),
        ...(savedReference === undefined ? {} : {
          editorReference: {
            frameId: savedReference.frameId,
            editCount: savedReference.editCount,
            digest: savedReference.digest,
          },
        }),
      })
      setState('sent')
      setFiles([])
      if (fileInput.current !== null) fileInput.current.value = ''
    } catch {
      setState('error')
    }
  }

  if (step === undefined || frame === undefined) return null
  const maskId = `illusion-editor-mask-${snapshot.artId}-${frame.id}`.replaceAll(/[^a-zA-Z0-9_-]/g, '-')
  const editEntries = Object.entries(edits)
  return (
    <section className="illusion-card illusion-art-card">
      <header className="illusion-header">
        <div><span className="illusion-kicker">{ui.kicker}</span><h3>{snapshot.title}</h3></div>
        <div className="illusion-header-actions">
          <button onClick={() => download(`${frame.id}.svg`, 'image/svg+xml', frameSvg(frame, step.frameWidth, step.frameHeight))} type="button">{ui.exportFrame}</button>
          <button onClick={() => download(`${snapshot.artId}.json`, 'application/json', JSON.stringify(snapshot, null, 2))} type="button">{ui.exportRecord}</button>
        </div>
      </header>
      <div className="illusion-art-layout">
        <aside className="illusion-art-frames">
          <strong>{ui.frames}</strong>
          {step.frames.map((item, index) => (
            <button className={index === frameIndex ? 'illusion-art-frame is-active' : 'illusion-art-frame'} key={item.id} onClick={() => { setFrameIndex(index); setFocus(undefined); setSelectedObjectId(undefined) }} type="button">
              <svg aria-label={frameLabel(item, language)} viewBox={`0 0 ${step.frameWidth} ${step.frameHeight}`}>
                {allRects(item).map((rect) => <rect fill={rect.fill} height={rect.height} key={rect.id} width={rect.width} x={rect.x} y={rect.y} />)}
              </svg>
              <span>{index + 1}. {frameLabel(item, language)}</span>
            </button>
          ))}
        </aside>
        <main className="illusion-art-main">
          <div className="illusion-art-toolbar">
            <strong>{frameIndex + 1}. {frameLabel(frame, language)}</strong>
            <div className="illusion-art-editor-tools">
              {(['select', 'pencil', 'eraser', 'eyedropper'] as const).map((item) => <button className={tool === item ? 'is-active' : ''} key={item} onClick={() => setTool(item)} type="button">{item === 'select' ? ui.selectTool : item === 'pencil' ? ui.pencil : item === 'eraser' ? ui.eraser : ui.eyedropper}</button>)}
              <input aria-label={ui.pencil} onChange={(event) => { setPaintColor(event.currentTarget.value); setTool('pencil') }} type="color" value={paintColor} />
              <button disabled={undoStack.length === 0} onClick={undo} type="button">{ui.undo}</button>
              <button disabled={redoStack.length === 0} onClick={redo} type="button">{ui.redo}</button>
            </div>
            <label>{ui.zoom} <input max="24" min="4" onChange={(event) => setZoom(Number(event.currentTarget.value))} type="range" value={zoom} /> {zoom}×</label>
          </div>
          <div className="illusion-art-scroll">
            <svg
              className="illusion-art-canvas"
              onPointerCancel={() => { setDrawing(false); setStart(undefined) }}
              onPointerDown={beginCanvasAction}
              onPointerMove={moveCanvasAction}
              onPointerUp={(event) => { if (tool === 'select') finishSelection(event); setDrawing(false) }}
              style={{ width: dimensions.width * zoom, height: dimensions.height * zoom }}
              viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            >
              <defs><mask height={dimensions.height} id={maskId} maskUnits="userSpaceOnUse" width={dimensions.width} x="0" y="0"><rect fill="#ffffff" height={dimensions.height} width={dimensions.width} x="0" y="0" />{editEntries.filter(([, color]) => color === null).map(([key]) => { const [x, y] = parsePixelKey(key); return <rect fill="#000000" height="1" key={key} width="1" x={x} y={y} /> })}</mask></defs>
              <g mask={`url(#${maskId})`}>{allRects(frame).map((rect) => <rect fill={rect.fill} height={rect.height} key={rect.id} width={rect.width} x={rect.x} y={rect.y} />)}</g>
              {editEntries.filter(([, color]) => color !== null).map(([key, color]) => { const [x, y] = parsePixelKey(key); return <rect fill={color as string} height="1" key={`edit-${key}`} width="1" x={x} y={y} /> })}
              {selectedObjectId === undefined ? null : (() => {
                const object = frame.objects?.find((item) => item.id === selectedObjectId)
                if (object === undefined) return null
                const bounds = objectBounds(object)
                return <rect className="illusion-art-object-selection" fill="none" {...bounds} />
              })()}
              {focus?.frameId === frame.id ? <rect className="illusion-art-selection" fill="none" height={focus.height} width={focus.width} x={focus.x} y={focus.y} /> : null}
            </svg>
          </div>
          <p className="illusion-art-help">{tool === 'select' ? ui.select : `${ui.pencil}: ${paintColor}`}</p>
        </main>
        <aside className="illusion-art-review">
          <strong>{ui.expected}</strong>
          {(frame.objects?.length ?? 0) > 0 ? <div className="illusion-art-objects"><span>{ui.objects}</span>{orderedObjects(frame).map((object) => <button className={object.id === selectedObjectId ? 'is-active' : ''} key={object.id} onClick={() => { setSelectedObjectId(object.id); const bounds = objectBounds(object); setFocus({ frameId: frame.id, frameIndex, ...bounds, objectId: object.id, objectLabel: object.label }) }} type="button"><b>{object.label}</b><small>{object.role ?? object.id}{object.locked ? ` · ${ui.locked}` : ''}</small></button>)}</div> : null}
          {focus === undefined ? null : <div className="illusion-art-focus"><span>{ui.focus}: x={focus.x}, y={focus.y}, {focus.width}×{focus.height}</span><button onClick={() => setFocus(undefined)} type="button">{ui.clear}</button></div>}
          <textarea onChange={(event) => { setText(event.currentTarget.value); setState('idle') }} placeholder={ui.thought} value={text} />
          <button className="illusion-art-save-reference" disabled={Object.keys(edits).length === 0 || !editorDirty} onClick={() => void saveReference()} type="button">{ui.saveReference}</button>
          {savedReference === undefined ? null : <small className="illusion-art-reference-saved">{ui.referenceSaved} · {savedReference.editCount} px · {savedReference.digest.slice(0, 12)}</small>}
          {!editorStorageAvailable ? <small className="illusion-export-error">Browser storage unavailable</small> : null}
          {editorDirty && Object.keys(edits).length > 0 ? <small>{ui.referenceDirty}</small> : null}
          <label className="illusion-art-file">{ui.files}<input multiple onChange={(event) => setFiles(Array.from(event.currentTarget.files ?? []))} ref={fileInput} type="file" /></label>
          {files.length > 0 ? <small>{files.map((file) => file.name).join(', ')}</small> : null}
          <button disabled={state === 'sending' || editorDirty || (text.trim().length === 0 && files.length === 0 && savedReference === undefined)} onClick={() => void submit()} type="button">{ui.send}</button>
          {state === 'sent' ? <small>{ui.sent}</small> : null}
          {state === 'error' ? <small className="illusion-export-error">{language === 'zh-CN' ? '无法保存或提交编辑者参照' : 'Could not save or submit the editor reference'}</small> : null}
        </aside>
      </div>
      <footer className="illusion-footer">
        <span>{frameLabel(frame, language)}</span><span>{step.frameWidth}×{step.frameHeight}</span><span>{step.frames.length} {ui.frames.toLowerCase()}</span>
      </footer>
    </section>
  )
}
