import { describe, expect, it } from 'vitest'

import {
  getPhaseLabel,
  getGameAssetLabel,
  getStepNote,
  getStepTitle,
  getUiCopy,
  inferUiLanguage,
} from '../src/client/i18n.js'
import type { BuildStep } from '../src/protocol.js'

const step: BuildStep = {
  index: 1,
  title: 'Character blockout',
  note: 'Establish the proportions',
  translations: {
    'zh-CN': {
      title: '人偶大形',
      note: '建立整体比例',
    },
  },
  phase: 'blockout',
  status: 'building',
}

describe('viewer localization', () => {
  it('selects a localized interface and phase label', () => {
    expect(getUiCopy('en').buildProcess).toBe('Build process')
    expect(getUiCopy('zh-CN').buildProcess).toBe('构建过程')
    expect(getPhaseLabel('validation', 'zh-CN')).toBe('验证')
    expect(getPhaseLabel('collision', 'zh-CN')).toBe('碰撞')
    expect(getGameAssetLabel({
      kind: 'game-asset',
      category: 'building',
      archetype: 'temple',
      style: 'stylized',
      usage: 'modular',
      target: 'godot',
      unit: 'm',
    }, 'zh-CN')).toBe('建筑 · Godot')
  })

  it('switches authored step text with a safe fallback', () => {
    expect(getStepTitle(step, 'zh-CN')).toBe('人偶大形')
    expect(getStepNote(step, 'zh-CN')).toBe('建立整体比例')
    expect(getStepTitle(step, 'en')).toBe('Character blockout')
    expect(getStepNote(step, 'en')).toBe('Establish the proportions')
  })

  it('infers Chinese only from a Chinese browser preference', () => {
    expect(inferUiLanguage(['zh-Hans-CN', 'en-US'])).toBe('zh-CN')
    expect(inferUiLanguage(['en-US', 'ja-JP'])).toBe('en')
  })
})
