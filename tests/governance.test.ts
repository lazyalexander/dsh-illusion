import { describe, expect, it } from 'vitest'

import { createBuiltinPluginPlan } from '../src/plugins/builtins.js'
import { PLUGIN_API_VERSION, PluginGovernor } from '../src/plugins/governance.js'

describe('PluginGovernor', () => {
  it('resolves the built-in capability graph and exclusive mutation owners', () => {
    const plan = createBuiltinPluginPlan()

    expect(plan.plugins.map((plugin) => plugin.id)).toEqual([
      'illusion.coordinator',
      'illusion.deepseek-modeler',
      'illusion.game-semantics',
      'illusion.technical-validator',
      'illusion.2d-art',
      'illusion.2d-validator',
      'illusion.export-coordinator',
    ])
    expect(plan.capabilities['scene-modeling']).toBe('illusion.deepseek-modeler')
    expect(plan.mutationOwners['model-scene']).toBe('illusion.deepseek-modeler')
    expect(plan.mutationOwners['download-artifact']).toBe('illusion.export-coordinator')
    expect(plan.mutationOwners['art-direction']).toBe('illusion.2d-art')
    expect(plan.promptSections).toHaveLength(7)
  })

  it('loads required plugins before their dependants', () => {
    const governor = new PluginGovernor()
    governor.register({
      id: 'test.base', version: '1.0.0', apiVersion: PLUGIN_API_VERSION,
      description: 'Base', provides: ['test-base'], risk: 'read-only',
    })
    governor.register({
      id: 'test.feature', version: '1.0.0', apiVersion: PLUGIN_API_VERSION,
      description: 'Feature', provides: ['test-feature'], requires: ['test.base'], risk: 'read-only',
    })

    expect(governor.resolve(['test.feature']).plugins.map((plugin) => plugin.id))
      .toEqual(['test.base', 'test.feature'])
  })

  it('rejects duplicate capability and mutation ownership', () => {
    const governor = new PluginGovernor()
    governor.register({
      id: 'test.one', version: '1.0.0', apiVersion: PLUGIN_API_VERSION,
      description: 'One', provides: ['shared-capability'], ownsMutationScopes: ['shared-state'], risk: 'model-write',
    })
    governor.register({
      id: 'test.two', version: '1.0.0', apiVersion: PLUGIN_API_VERSION,
      description: 'Two', provides: ['shared-capability'], ownsMutationScopes: ['shared-state'], risk: 'model-write',
    })

    expect(() => governor.resolve()).toThrow('provided by both')
  })

  it('rejects missing dependencies, conflicts, and cycles', () => {
    const missing = new PluginGovernor()
    missing.register({
      id: 'test.missing-user', version: '1.0.0', apiVersion: PLUGIN_API_VERSION,
      description: 'Missing dependency', provides: ['missing-user'], requires: ['test.absent'], risk: 'read-only',
    })
    expect(() => missing.resolve()).toThrow('not registered')

    const conflicting = new PluginGovernor()
    conflicting.register({
      id: 'test.a', version: '1.0.0', apiVersion: PLUGIN_API_VERSION,
      description: 'A', provides: ['cap-a'], conflicts: ['test.b'], risk: 'read-only',
    })
    conflicting.register({
      id: 'test.b', version: '1.0.0', apiVersion: PLUGIN_API_VERSION,
      description: 'B', provides: ['cap-b'], risk: 'read-only',
    })
    expect(() => conflicting.resolve()).toThrow('conflicts')

    const cyclic = new PluginGovernor()
    cyclic.register({
      id: 'test.left', version: '1.0.0', apiVersion: PLUGIN_API_VERSION,
      description: 'Left', provides: ['left'], requires: ['test.right'], risk: 'read-only',
    })
    cyclic.register({
      id: 'test.right', version: '1.0.0', apiVersion: PLUGIN_API_VERSION,
      description: 'Right', provides: ['right'], requires: ['test.left'], risk: 'read-only',
    })
    expect(() => cyclic.resolve()).toThrow('dependency cycle')
  })
})
