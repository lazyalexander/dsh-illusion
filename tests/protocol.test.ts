import { describe, expect, it } from 'vitest'

import { parseBuildCommand } from '../src/protocol.js'

describe('parseBuildCommand', () => {
  it('parses bounded game semantics with engine references', () => {
    const command = parseBuildCommand({
      action: 'start',
      title: 'Semantic crate',
      profile: { kind: 'game-asset', category: 'prop' },
      operations: [{ type: 'upsert', object: { id: 'crate', geometry: { kind: 'box' } } }],
      semantics: {
        pivot: { position: [0, 0, 0] },
        bounds: { min: [-0.5, -0.5, 0], max: [0.5, 0.5, 1] },
        modularGrid: { size: [1, 1, 1] },
        sockets: [{ id: 'carry', parentId: 'crate', position: [0, 0, 1] }],
        colliders: [{ id: 'body', ownerId: 'crate', shape: 'box', size: [1, 1, 1] }],
        materialSlots: [{ id: 'wood', objectIds: ['crate'] }],
        lodGroups: [{ id: 'crate-lod', levels: [{ level: 0, screenCoverage: 1, objectIds: ['crate'] }] }],
      },
    })

    expect(command.semantics).toMatchObject({
      pivot: { position: [0, 0, 0], rotation: [0, 0, 0] },
      sockets: [{ id: 'carry', parentId: 'crate' }],
      colliders: [{ id: 'body', shape: 'box', trigger: false }],
    })
  })

  it('rejects invalid semantic bounds and duplicate IDs', () => {
    expect(() => parseBuildCommand({
      action: 'apply', title: 'Bad bounds',
      semantics: { pivot: { position: [0, 0, 0] }, bounds: { min: [1, 0, 0], max: [0, 1, 1] } },
    })).toThrow('below max')
    expect(() => parseBuildCommand({
      action: 'apply', title: 'Duplicate sockets',
      semantics: {
        pivot: { position: [0, 0, 0] }, bounds: { min: [0, 0, 0], max: [1, 1, 1] },
        sockets: [{ id: 'same' }, { id: 'same' }],
      },
    })).toThrow('duplicate id')
  })

  it('parses a categorized game asset profile', () => {
    const command = parseBuildCommand({
      action: 'start',
      title: 'Modular harbor warehouse',
      phase: 'structure',
      profile: {
        kind: 'game-asset',
        category: 'building',
        archetype: 'industrial harbor warehouse',
        style: 'low-poly',
        usage: 'modular',
        target: 'godot',
        unit: 'm',
      },
    })

    expect(command.profile).toEqual({
      kind: 'game-asset',
      category: 'building',
      archetype: 'industrial harbor warehouse',
      style: 'low-poly',
      usage: 'modular',
      target: 'godot',
      unit: 'm',
    })
  })

  it('rejects unsupported game asset categories', () => {
    expect(() => parseBuildCommand({
      action: 'start',
      title: 'Unknown asset',
      profile: { kind: 'game-asset', category: 'spaceship-person' },
    })).toThrow('profile.category is not supported')
  })

  it('accepts an exact live checkpoint resume without operations', () => {
    expect(parseBuildCommand({
      action: 'resume',
      title: 'Branch checkpoint',
      sourceBuildId: 'build-source',
      sourceStep: 3,
      translations: { 'zh-CN': { title: '分支检查点' } },
    })).toMatchObject({
      action: 'resume',
      sourceBuildId: 'build-source',
      sourceStep: 3,
      operations: [],
    })
  })

  it('rejects malformed resume commands', () => {
    expect(() => parseBuildCommand({ action: 'resume', title: 'Missing source' })).toThrow('sourceBuildId')
    expect(() => parseBuildCommand({
      action: 'resume',
      title: 'Mutating resume',
      sourceBuildId: 'source',
      sourceStep: 1,
      operations: [{ type: 'clear' }],
    })).toThrow('does not accept operations')
  })
  it('normalizes an upsert operation and defaults its presentation values', () => {
    const command = parseBuildCommand({
      action: 'start',
      title: ' Block study ',
      operations: [{
        type: 'upsert',
        object: {
          id: 'base',
          geometry: { kind: 'box', width: 10, height: 2, depth: 6 },
        },
      }],
    })

    expect(command.title).toBe('Block study')
    expect(command.operations[0]).toEqual({
      type: 'upsert',
      object: {
        id: 'base',
        label: 'base',
        geometry: { kind: 'box', width: 10, height: 2, depth: 6 },
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: '#76a9ff',
        opacity: 1,
        roughness: 0.58,
        metalness: 0.12,
        emissive: '#000000',
        doubleSided: false,
      },
    })
  })

  it('rejects empty apply steps and malformed colors', () => {
    expect(() => parseBuildCommand({ action: 'apply', title: 'Nothing', operations: [] }))
      .toThrow('apply requires at least one operation')
    expect(() => parseBuildCommand({
      action: 'start',
      title: 'Bad color',
      operations: [{
        type: 'upsert',
        object: { id: 'bad', color: 'blue', geometry: { kind: 'sphere' } },
      }],
    })).toThrow('six-digit hex color')
  })

  it('parses character phases, hierarchical parts, custom geometry, and rig joints', () => {
    const command = parseBuildCommand({
      action: 'start',
      title: 'Hero character',
      note: 'Establish proportions',
      translations: {
        'zh-CN': {
          title: '英雄角色',
          note: '建立整体比例',
        },
      },
      phase: 'blockout',
      profile: {
        kind: 'character',
        style: 'anime',
        target: 'interactive',
        unit: 'm',
        height: 1.68,
      },
      operations: [
        {
          type: 'upsert',
          object: {
            id: 'torso',
            role: 'body.torso',
            geometry: { kind: 'ellipsoid', radii: [0.22, 0.13, 0.34] },
          },
        },
        {
          type: 'upsert',
          object: {
            id: 'hair-lock',
            parentId: 'torso',
            role: 'hair.back',
            geometry: {
              kind: 'tube',
              radius: 0.03,
              path: [[0, 0, 0], [0.1, 0, -0.4]],
            },
          },
        },
        {
          type: 'upsert_joint',
          joint: {
            id: 'hips',
            role: 'hips',
            position: [0, 0, 0.9],
          },
        },
      ],
    })

    expect(command).toMatchObject({
      phase: 'blockout',
      profile: { kind: 'character', style: 'anime', target: 'interactive', height: 1.68 },
      translations: { 'zh-CN': { title: '英雄角色', note: '建立整体比例' } },
    })
    expect(command.operations[1]).toMatchObject({
      type: 'upsert',
      object: { parentId: 'torso', geometry: { kind: 'tube', closed: false } },
    })
    expect(command.operations[2]).toMatchObject({
      type: 'upsert_joint',
      joint: { id: 'hips', role: 'hips' },
    })
  })

  it('rejects empty or unsupported step translations', () => {
    expect(() => parseBuildCommand({
      action: 'start',
      title: 'Character',
      translations: {},
    })).toThrow('translations must contain en or zh-CN')
    expect(() => parseBuildCommand({
      action: 'start',
      title: 'Character',
      translations: { 'zh-CN': { title: '' } },
    })).toThrow('translations.zh-CN.title must be a non-empty string')
  })

  it('rejects invalid custom mesh topology', () => {
    expect(() => parseBuildCommand({
      action: 'start',
      title: 'Broken face',
      operations: [{
        type: 'upsert',
        object: {
          id: 'face',
          geometry: {
            kind: 'mesh',
            vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
            triangles: [[0, 1, 3]],
          },
        },
      }],
    })).toThrow('outside the vertex array')
  })
})
