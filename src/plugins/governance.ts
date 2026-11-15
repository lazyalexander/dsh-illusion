export const PLUGIN_API_VERSION = 1 as const

export type CapabilityPluginRisk = 'read-only' | 'model-write' | 'content-write' | 'artifact-write'

export interface CapabilityPluginManifest {
  readonly id: string
  readonly version: string
  readonly apiVersion: typeof PLUGIN_API_VERSION
  readonly description: string
  readonly provides: readonly string[]
  readonly requires?: readonly string[]
  readonly conflicts?: readonly string[]
  readonly ownsMutationScopes?: readonly string[]
  readonly risk: CapabilityPluginRisk
  readonly prompt?: string
}

export interface ResolvedPluginPlan {
  readonly plugins: readonly CapabilityPluginManifest[]
  readonly capabilities: Readonly<Record<string, string>>
  readonly mutationOwners: Readonly<Record<string, string>>
  readonly promptSections: readonly string[]
}

function assertIdentifier(value: string, label: string): void {
  if (!/^[a-z][a-z0-9.-]*$/.test(value)) {
    throw new TypeError(`${label} must use lowercase letters, digits, dots, or hyphens`)
  }
}

export class PluginGovernor {
  readonly #manifests = new Map<string, CapabilityPluginManifest>()

  register(manifest: CapabilityPluginManifest): void {
    assertIdentifier(manifest.id, 'plugin id')
    if (manifest.apiVersion !== PLUGIN_API_VERSION) {
      throw new RangeError(`plugin “${manifest.id}” requires unsupported API ${manifest.apiVersion}`)
    }
    if (this.#manifests.has(manifest.id)) throw new Error(`plugin “${manifest.id}” is already registered`)
    if (manifest.provides.length === 0) throw new RangeError(`plugin “${manifest.id}” must provide a capability`)
    for (const capability of manifest.provides) assertIdentifier(capability, 'capability')
    for (const scope of manifest.ownsMutationScopes ?? []) assertIdentifier(scope, 'mutation scope')
    this.#manifests.set(manifest.id, structuredClone(manifest))
  }

  resolve(requestedIds: readonly string[] = [...this.#manifests.keys()]): ResolvedPluginPlan {
    const selected = new Map<string, CapabilityPluginManifest>()
    const visit = (id: string, ancestry: readonly string[]): void => {
      if (ancestry.includes(id)) throw new Error(`plugin dependency cycle: ${[...ancestry, id].join(' -> ')}`)
      if (selected.has(id)) return
      const manifest = this.#manifests.get(id)
      if (manifest === undefined) throw new Error(`required plugin “${id}” is not registered`)
      for (const required of manifest.requires ?? []) visit(required, [...ancestry, id])
      selected.set(id, manifest)
    }
    for (const id of requestedIds) visit(id, [])

    for (const manifest of selected.values()) {
      for (const conflict of manifest.conflicts ?? []) {
        if (selected.has(conflict)) throw new Error(`plugin “${manifest.id}” conflicts with “${conflict}”`)
      }
    }

    const capabilities: Record<string, string> = {}
    const mutationOwners: Record<string, string> = {}
    for (const manifest of selected.values()) {
      for (const capability of manifest.provides) {
        const owner = capabilities[capability]
        if (owner !== undefined) {
          throw new Error(`capability “${capability}” is provided by both “${owner}” and “${manifest.id}”`)
        }
        capabilities[capability] = manifest.id
      }
      for (const scope of manifest.ownsMutationScopes ?? []) {
        const owner = mutationOwners[scope]
        if (owner !== undefined) {
          throw new Error(`mutation scope “${scope}” is owned by both “${owner}” and “${manifest.id}”`)
        }
        mutationOwners[scope] = manifest.id
      }
    }

    return {
      plugins: [...selected.values()].map((manifest) => structuredClone(manifest)),
      capabilities,
      mutationOwners,
      promptSections: [...selected.values()].flatMap((manifest) => manifest.prompt === undefined ? [] : [manifest.prompt]),
    }
  }
}
