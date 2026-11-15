import {
  PLUGIN_API_VERSION,
  PluginGovernor,
  type CapabilityPluginManifest,
  type ResolvedPluginPlan,
} from './governance.js'

export const BUILTIN_PLUGIN_MANIFESTS: readonly CapabilityPluginManifest[] = [
  {
    id: 'illusion.coordinator',
    version: '1.0.0',
    apiVersion: PLUGIN_API_VERSION,
    description: 'Owns reviewable history, branching, and user-directed execution.',
    provides: ['build-history', 'checkpoint-review', 'plan-routing'],
    risk: 'read-only',
    prompt: 'Publish every semantic node as an independently reviewable checkpoint. Keep historical nodes immutable and branch when revising an older checkpoint.',
  },
  {
    id: 'illusion.deepseek-modeler',
    version: '1.0.0',
    apiVersion: PLUGIN_API_VERSION,
    description: 'Owns DeepSeek scene and modeling-semantics mutations.',
    provides: ['scene-modeling', 'game-asset-taxonomy'],
    requires: ['illusion.coordinator'],
    ownsMutationScopes: ['model-scene', 'model-semantics'],
    risk: 'model-write',
    prompt: 'DeepSeek is the only modeling role. Apply scene and semantic changes through visible tool operations with stable IDs.',
  },
  {
    id: 'illusion.game-semantics',
    version: '1.0.0',
    apiVersion: PLUGIN_API_VERSION,
    description: 'Defines and validates game-engine pivot, bounds, sockets, colliders, material slots, modular grids, and LOD groups.',
    provides: ['game-semantics-schema', 'game-semantics-validation'],
    requires: ['illusion.deepseek-modeler'],
    risk: 'read-only',
    prompt: 'For game-ready checkpoints, declare semantics with pivot, bounds, sockets, colliders, material slots, modular grid, and LOD groups as applicable. Every referenced object ID must exist.',
  },
  {
    id: 'illusion.technical-validator',
    version: '1.0.0',
    apiVersion: PLUGIN_API_VERSION,
    description: 'Reports observable gates without silently editing the model.',
    provides: ['technical-validation'],
    requires: ['illusion.game-semantics'],
    risk: 'read-only',
    prompt: 'Separate pass, needs-revision, and not-observable findings. Validation never grants authority to mutate or export.',
  },
  {
    id: 'illusion.2d-art',
    version: '1.0.0',
    apiVersion: PLUGIN_API_VERSION,
    description: 'Owns versioned 2D art briefs, style contracts, and production plans.',
    provides: ['art-2d-pipeline', 'style-contracts'],
    requires: ['illusion.coordinator'],
    ownsMutationScopes: ['art-direction'],
    risk: 'content-write',
    prompt: 'Treat the author as the owner of style intent. Illusion may propose a concrete style contract, but the author must confirm it before production treats it as accepted.',
  },
  {
    id: 'illusion.2d-validator',
    version: '1.0.0',
    apiVersion: PLUGIN_API_VERSION,
    description: 'Validates observable 2D art structure and style-contract consistency without repainting.',
    provides: ['art-2d-validation'],
    requires: ['illusion.2d-art'],
    risk: 'read-only',
    prompt: 'Validate canvas, palette, transparency, slicing, and accepted style invariants separately from subjective art approval. Never repaint as a hidden validation step.',
  },
  {
    id: 'illusion.export-coordinator',
    version: '1.0.0',
    apiVersion: PLUGIN_API_VERSION,
    description: 'Creates user-requested JSON and GLB artifacts bound to a checkpoint.',
    provides: ['build-json-export', 'glb-export'],
    requires: ['illusion.coordinator'],
    ownsMutationScopes: ['download-artifact'],
    risk: 'artifact-write',
    prompt: 'Export only on explicit user action. Bind every artifact to its build ID and selected step; do not claim engine import acceptance.',
  },
] as const

export function createBuiltinPluginPlan(): ResolvedPluginPlan {
  const governor = new PluginGovernor()
  for (const manifest of BUILTIN_PLUGIN_MANIFESTS) governor.register(manifest)
  return governor.resolve()
}
