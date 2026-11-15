import { useEffect, useState } from 'react'

import type {
  BuildPhase,
  BuildStep,
  CharacterBuildProfile,
  GameAssetBuildProfile,
  UiLocale,
} from '../protocol.js'

const STORAGE_KEY = 'dsh-illusion:ui-language:v1'
const LANGUAGE_EVENT = 'dsh-illusion:ui-language-change'

const copy = {
  en: {
    characterBuild: 'ILLUSION · CHARACTER BUILD',
    gameAssetBuild: 'ILLUSION · GAME ASSET',
    liveBuild: 'ILLUSION · LIVE BUILD',
    exportStep: 'Export step GLB',
    exporting: 'Exporting…',
    exportBuild: 'Export build JSON',
    branchFromStep: 'Branch from this step',
    branching: 'Creating branch…',
    complete: 'Complete',
    building: 'Building',
    buildProcess: 'Build process',
    latestThought: 'Your latest thought',
    thoughtPlaceholder: 'Write what to try, change, or preserve at this step.',
    thoughtSaved: 'Saved in this browser · included in Build JSON',
    thoughtUnavailable: 'Browser storage unavailable · kept until this card closes',
    isExpected: 'Is this what you expected?',
    reviewHelp: 'Continue, finish, or describe an adjustment. You can attach reference files with the description.',
    adjustPlaceholder: 'Describe what should change or what must stay the same.',
    addReferences: 'Add reference files',
    acceptContinue: 'Yes, continue',
    sendAdjustment: 'Send adjustment',
    runPlan: 'Run plan / to target',
    finishBuild: 'Finish build',
    reviewSent: 'Sent to DeepSeek · each published plan node will remain in history',
    reviewFailed: 'Could not send this review',
    branchFailed: 'Could not create the branch',
    historicalStep: 'Historical step',
    historicalHelp: 'This preview stays immutable. Export it here, or use its original card in chat to branch from that checkpoint.',
    selectStep: 'Select build step',
    step: 'Step',
    part: 'part',
    parts: 'parts',
    joint: 'joint',
    joints: 'joints',
    sockets: 'sockets',
    colliders: 'colliders',
    lodGroups: 'LOD groups',
    exportFailed: 'Export failed',
    viewportHelp: 'Drag to orbit · Scroll to zoom',
    viewportLabel: '3D construction viewport',
    viewportDeferred: '3D preview loads when this checkpoint is near the screen',
    pending: 'Publishing 3D build step…',
    language: 'Language',
  },
  'zh-CN': {
    characterBuild: 'ILLUSION · 人偶构建',
    gameAssetBuild: 'ILLUSION · 游戏资产',
    liveBuild: 'ILLUSION · 实时构建',
    exportStep: '导出当前步骤 GLB',
    exporting: '正在导出…',
    exportBuild: '导出完整构建 JSON',
    branchFromStep: '从此步骤创建分支',
    branching: '正在创建分支…',
    complete: '已完成',
    building: '构建中',
    buildProcess: '构建过程',
    latestThought: '你在这一步的最新想法',
    thoughtPlaceholder: '写下下一步要尝试、修改或保留的内容。',
    thoughtSaved: '已保存在此浏览器 · 将包含在构建 JSON 中',
    thoughtUnavailable: '浏览器存储不可用 · 仅保留到当前卡片关闭',
    isExpected: '这是你的预期吗？',
    reviewHelp: '可以继续、完成，或描述要调整的内容；也可以随说明附上参考文件。',
    adjustPlaceholder: '描述要修改的内容，以及必须保留的特征。',
    addReferences: '添加参考文件',
    acceptContinue: '符合，继续',
    sendAdjustment: '提交微调',
    runPlan: '按计划运行 / 到指定节点',
    finishBuild: '完成构建',
    reviewSent: '已发送给 DeepSeek · 每个已发布的计划节点都会保留在历史中',
    reviewFailed: '无法提交本次审阅',
    branchFailed: '无法创建分支',
    historicalStep: '历史步骤',
    historicalHelp: '此预览保持不变。可在这里导出，或回到聊天中的原始卡片，从该检查点创建分支。',
    selectStep: '选择构建步骤',
    step: '步骤',
    part: '个部件',
    parts: '个部件',
    joint: '个关节',
    joints: '个关节',
    sockets: '个挂点',
    colliders: '个碰撞体',
    lodGroups: '个 LOD 组',
    exportFailed: '导出失败',
    viewportHelp: '拖动旋转 · 滚轮缩放',
    viewportLabel: '三维构建视口',
    viewportDeferred: '滚动到此检查点附近时加载三维预览',
    pending: '正在发布三维构建步骤…',
    language: '语言',
  },
} as const

const phaseCopy: Record<BuildPhase, Record<UiLocale, string>> = {
  reference: { en: 'Reference', 'zh-CN': '参考' },
  silhouette: { en: 'Silhouette', 'zh-CN': '轮廓' },
  blockout: { en: 'Blockout', 'zh-CN': '大形' },
  structure: { en: 'Structure', 'zh-CN': '结构' },
  anatomy: { en: 'Anatomy', 'zh-CN': '解剖' },
  face: { en: 'Face', 'zh-CN': '面部' },
  hair: { en: 'Hair', 'zh-CN': '头发' },
  clothing: { en: 'Clothing', 'zh-CN': '服装' },
  accessories: { en: 'Accessories', 'zh-CN': '配饰' },
  materials: { en: 'Materials', 'zh-CN': '材质' },
  details: { en: 'Details', 'zh-CN': '细节' },
  collision: { en: 'Collision', 'zh-CN': '碰撞' },
  lod: { en: 'LOD', 'zh-CN': '层级细节' },
  rig: { en: 'Rig', 'zh-CN': '骨架' },
  expressions: { en: 'Expressions', 'zh-CN': '表情' },
  validation: { en: 'Validation', 'zh-CN': '验证' },
  assembly: { en: 'Assembly', 'zh-CN': '装配' },
  complete: { en: 'Complete', 'zh-CN': '完成' },
}

const styleCopy: Record<CharacterBuildProfile['style'], Record<UiLocale, string>> = {
  realistic: { en: 'Realistic', 'zh-CN': '写实' },
  stylized: { en: 'Stylized', 'zh-CN': '风格化' },
  anime: { en: 'Anime', 'zh-CN': '动漫' },
  custom: { en: 'Custom', 'zh-CN': '自定义' },
}

const targetCopy: Record<CharacterBuildProfile['target'], Record<UiLocale, string>> = {
  static: { en: 'Static', 'zh-CN': '静态' },
  game: { en: 'Game', 'zh-CN': '游戏' },
  mmd: { en: 'MMD', 'zh-CN': 'MMD' },
  vtuber: { en: 'VTuber', 'zh-CN': '虚拟主播' },
  interactive: { en: 'Interactive', 'zh-CN': '交互' },
  print: { en: 'Print', 'zh-CN': '打印' },
  custom: { en: 'Custom', 'zh-CN': '自定义' },
}

const categoryCopy: Record<GameAssetBuildProfile['category'], Record<UiLocale, string>> = {
  humanoid: { en: 'Humanoid', 'zh-CN': '人形角色' },
  creature: { en: 'Creature', 'zh-CN': '动物与生物' },
  building: { en: 'Building', 'zh-CN': '建筑' },
  vehicle: { en: 'Vehicle', 'zh-CN': '载具' },
  prop: { en: 'Prop', 'zh-CN': '道具' },
  vegetation: { en: 'Vegetation', 'zh-CN': '植被' },
  terrain: { en: 'Terrain', 'zh-CN': '地形' },
  environment: { en: 'Environment', 'zh-CN': '环境组合' },
}

const engineTargetCopy: Record<GameAssetBuildProfile['target'], Record<UiLocale, string>> = {
  generic: { en: 'Generic', 'zh-CN': '通用' },
  godot: { en: 'Godot', 'zh-CN': 'Godot' },
  unity: { en: 'Unity', 'zh-CN': 'Unity' },
  unreal: { en: 'Unreal', 'zh-CN': 'Unreal' },
  web: { en: 'Web', 'zh-CN': '网页' },
  custom: { en: 'Custom', 'zh-CN': '自定义' },
}

export type UiCopy = typeof copy.en | typeof copy['zh-CN']

export function getUiCopy(language: UiLocale): UiCopy {
  return copy[language]
}

export function getPhaseLabel(phase: BuildPhase | undefined, language: UiLocale): string {
  return phaseCopy[phase ?? 'assembly'][language]
}

export function getStyleLabel(style: CharacterBuildProfile['style'], language: UiLocale): string {
  return styleCopy[style][language]
}

export function getTargetLabel(target: CharacterBuildProfile['target'], language: UiLocale): string {
  return targetCopy[target][language]
}

export function getGameAssetLabel(profile: GameAssetBuildProfile, language: UiLocale): string {
  return `${categoryCopy[profile.category][language]} · ${engineTargetCopy[profile.target][language]}`
}

export function getStepTitle(step: BuildStep, language: UiLocale): string {
  return step.translations?.[language]?.title ?? step.title
}

export function getStepNote(step: BuildStep, language: UiLocale): string | undefined {
  return step.translations?.[language]?.note ?? step.note
}

export function inferUiLanguage(languages: readonly string[]): UiLocale {
  return languages.some((language) => language.toLowerCase().startsWith('zh')) ? 'zh-CN' : 'en'
}

function loadUiLanguage(): UiLocale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'zh-CN') return stored
  } catch {
    // Fall through to the browser preference when storage is unavailable.
  }
  return inferUiLanguage(window.navigator.languages)
}

function persistUiLanguage(language: UiLocale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Language switching remains available for this page without persistence.
  }
  window.dispatchEvent(new CustomEvent<UiLocale>(LANGUAGE_EVENT, { detail: language }))
}

export function useUiLanguage(): readonly [UiLocale, (language: UiLocale) => void] {
  const [language, setLanguage] = useState<UiLocale>(loadUiLanguage)

  useEffect(() => {
    const update = (event: Event): void => {
      const next = (event as CustomEvent<UiLocale>).detail
      if (next === 'en' || next === 'zh-CN') setLanguage(next)
    }
    window.addEventListener(LANGUAGE_EVENT, update)
    return () => window.removeEventListener(LANGUAGE_EVENT, update)
  }, [])

  return [language, persistUiLanguage]
}
