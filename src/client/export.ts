import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

import type { BuildSnapshot } from '../protocol.js'
import { materializeBuildScene } from '../scene.js'
import { createSceneObjectGroup, disposeSceneObjectGroup } from './sceneObjects.js'
import type { StepThoughts } from './thoughts.js'

export interface BuildExportRecord {
  readonly schema: 'dsh-illusion/build-export@1'
  readonly exportedAt: string
  readonly selectedStep: number
  readonly snapshot: BuildSnapshot
  readonly thoughts: StepThoughts
}

export function safeFilename(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return normalized || 'illusion-build'
}

export function createBuildExportRecord(
  snapshot: BuildSnapshot,
  thoughts: StepThoughts,
  selectedStep: number,
  exportedAt = new Date().toISOString(),
): BuildExportRecord {
  return {
    schema: 'dsh-illusion/build-export@1',
    exportedAt,
    selectedStep,
    snapshot,
    thoughts,
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.hidden = true
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function downloadBuildRecord(
  snapshot: BuildSnapshot,
  thoughts: StepThoughts,
  selectedStep: number,
): void {
  const record = createBuildExportRecord(snapshot, thoughts, selectedStep)
  const blob = new Blob([`${JSON.stringify(record, null, 2)}\n`], { type: 'application/json' })
  downloadBlob(blob, `${safeFilename(snapshot.title)}-build.json`)
}

export async function downloadStepGlb(snapshot: BuildSnapshot, stepIndex: number): Promise<void> {
  const step = snapshot.steps[stepIndex]
  if (step === undefined) throw new RangeError('selected build step does not exist')
  const scene = materializeBuildScene(snapshot, stepIndex)
  const group = createSceneObjectGroup(scene.objects, { joints: scene.joints })
  group.userData = {
    illusionBuildId: snapshot.buildId,
    illusionProtocol: snapshot.protocol,
    illusionStep: step.index,
    illusionStepTitle: step.title,
    ...(snapshot.profile === undefined ? {} : { illusionBuildProfile: snapshot.profile }),
    ...(scene.semantics === undefined ? {} : { illusionGameSemantics: scene.semantics }),
  }
  try {
    const result = await new GLTFExporter().parseAsync(group, {
      binary: true,
      onlyVisible: true,
    })
    if (!(result instanceof ArrayBuffer)) throw new TypeError('GLB export did not return binary data')
    const stepNumber = String(step.index).padStart(2, '0')
    const blob = new Blob([result], { type: 'model/gltf-binary' })
    downloadBlob(blob, `${safeFilename(snapshot.title)}-step-${stepNumber}.glb`)
  } finally {
    disposeSceneObjectGroup(group)
  }
}
