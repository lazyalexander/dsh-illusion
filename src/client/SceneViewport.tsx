import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import type { RigJoint, SceneObject } from '../protocol.js'
import { createSceneObjectGroup, disposeSceneObjectGroup } from './sceneObjects.js'

interface SceneViewportProps {
  readonly ariaLabel: string
  readonly deferredLabel: string
  readonly objects: readonly SceneObject[]
  readonly joints: readonly RigJoint[]
}

export function SceneViewport({ ariaLabel, deferredLabel, objects, joints }: SceneViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isNearViewport, setIsNearViewport] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      setIsNearViewport(entry?.isIntersecting ?? false)
    }, { rootMargin: '600px 0px' })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !isNearViewport) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111721)
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 1_000_000)
    camera.position.set(8, 7, 10)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.append(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08

    scene.add(new THREE.HemisphereLight(0xdde9ff, 0x293241, 2.2))
    const key = new THREE.DirectionalLight(0xffffff, 3.4)
    key.position.set(10, 16, 8)
    key.castShadow = true
    scene.add(key)

    const group = createSceneObjectGroup(objects, {
      includeEdges: true,
      joints,
      showRig: true,
    })
    scene.add(group)

    const bounds = new THREE.Box3().setFromObject(group)
    const size = bounds.isEmpty() ? new THREE.Vector3(6, 6, 6) : bounds.getSize(new THREE.Vector3())
    const center = bounds.isEmpty() ? new THREE.Vector3() : bounds.getCenter(new THREE.Vector3())
    const span = Math.max(size.x, size.y, size.z, 2)
    controls.target.copy(center)
    camera.near = Math.max(span / 10_000, 0.01)
    camera.far = Math.max(span * 100, 1000)
    camera.position.copy(center).add(new THREE.Vector3(span * 1.25, span, span * 1.5))
    camera.updateProjectionMatrix()

    const gridSize = Math.max(20, Math.ceil(span * 3 / 10) * 10)
    const grid = new THREE.GridHelper(gridSize, 20, 0x43536a, 0x283648)
    grid.position.y = bounds.isEmpty() ? 0 : bounds.min.y
    scene.add(grid)
    scene.add(new THREE.AxesHelper(Math.max(span * 0.35, 1.5)))

    const resize = (): void => {
      const width = Math.max(container.clientWidth, 1)
      const height = Math.max(container.clientHeight, 1)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()

    let frame = 0
    const render = (): void => {
      controls.update()
      renderer.render(scene, camera)
      frame = window.requestAnimationFrame(render)
    }
    render()

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      disposeSceneObjectGroup(group)
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [isNearViewport, joints, objects])

  return (
    <div ref={containerRef} className="illusion-viewport" aria-label={ariaLabel}>
      {!isNearViewport ? <span className="illusion-viewport-deferred">{deferredLabel}</span> : null}
    </div>
  )
}
