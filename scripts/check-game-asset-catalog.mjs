import { readFile } from 'node:fs/promises'

const catalogUrl = new URL('../benchmarks/game-asset-catalog.json', import.meta.url)
const catalog = JSON.parse(await readFile(catalogUrl, 'utf8'))
const agentmentUrl = new URL('../agents/game-modeling-agentment.json', import.meta.url)
const agentment = JSON.parse(await readFile(agentmentUrl, 'utf8'))
const smokeUrl = new URL('../benchmarks/game-asset-smoke-2026-11-14.json', import.meta.url)
const smoke = JSON.parse(await readFile(smokeUrl, 'utf8'))
const buildingSmokeUrl = new URL('../benchmarks/building-variety-smoke-2026-11-14.json', import.meta.url)
const buildingSmoke = JSON.parse(await readFile(buildingSmokeUrl, 'utf8'))
const artCatalogUrl = new URL('../benchmarks/2d-art-style-catalog.json', import.meta.url)
const artCatalog = JSON.parse(await readFile(artCatalogUrl, 'utf8'))
const artAgentmentUrl = new URL('../agents/2d-art-agentment.json', import.meta.url)
const artAgentment = JSON.parse(await readFile(artAgentmentUrl, 'utf8'))
const expectedCategories = new Set([
  'humanoid',
  'creature',
  'building',
  'vehicle',
  'prop',
  'vegetation',
  'terrain',
  'environment',
])

if (catalog.schema !== 'dsh-illusion/game-asset-benchmark@1' || !Array.isArray(catalog.cases)) {
  throw new Error('invalid game asset benchmark catalog')
}

const ids = new Set()
const coveredCategories = new Set()
let buildingArchetypes = 0

for (const item of catalog.cases) {
  if (typeof item.id !== 'string' || ids.has(item.id)) throw new Error(`invalid or duplicate case id: ${item.id}`)
  ids.add(item.id)
  if (item.profile?.kind !== 'game-asset' || !expectedCategories.has(item.profile.category)) {
    throw new Error(`case ${item.id} has an invalid game asset profile`)
  }
  coveredCategories.add(item.profile.category)
  if (item.profile.category === 'building') buildingArchetypes += 1
  if (!Array.isArray(item.requiredPhases) || item.requiredPhases.length < 3) {
    throw new Error(`case ${item.id} must cover at least three phases`)
  }
  if (!Array.isArray(item.acceptance) || item.acceptance.length < 3) {
    throw new Error(`case ${item.id} must define at least three acceptance checks`)
  }
}

for (const category of expectedCategories) {
  if (!coveredCategories.has(category)) throw new Error(`missing category: ${category}`)
}
if (buildingArchetypes < 4) throw new Error('the catalog must cover at least four building archetypes')

const expectedRoles = ['asset-director', 'deepseek-modeler', 'technical-validator', 'export-coordinator']
const expectedRolePlugins = new Map([
  ['asset-director', 'illusion.coordinator'],
  ['deepseek-modeler', 'illusion.deepseek-modeler'],
  ['technical-validator', 'illusion.technical-validator'],
  ['export-coordinator', 'illusion.export-coordinator'],
])
if (agentment.schema !== 'dsh-illusion/agentment@1' || !Array.isArray(agentment.roles)) {
  throw new Error('invalid game modeling agentment contract')
}
for (const role of expectedRoles) {
  const item = agentment.roles.find((candidate) => candidate.id === role)
  if (item === undefined) throw new Error(`missing agentment role: ${role}`)
  if (item.pluginId !== expectedRolePlugins.get(role)) throw new Error(`agentment role ${role} has an invalid plugin binding`)
}
const mutationRoles = agentment.roles.filter((item) => item.mutatesScene).map((item) => item.id)
if (mutationRoles.length !== 1 || mutationRoles[0] !== 'deepseek-modeler') {
  throw new Error('deepseek-modeler must be the only scene mutation role')
}
if (agentment.governance?.apiVersion !== 1) throw new Error('agentment plugin governance is missing')

if (smoke.schema !== 'dsh-illusion/game-asset-smoke@1' || !Array.isArray(smoke.results)) {
  throw new Error('invalid game asset smoke evidence')
}
const smokeCategories = new Set(smoke.results.filter((item) => item.status === 'complete').map((item) => item.category))
for (const category of expectedCategories) {
  if (!smokeCategories.has(category)) throw new Error(`smoke evidence is missing category: ${category}`)
}
if (smoke.history?.gameAssetCards !== 24 || smoke.viewportStress?.visibleModelRecovered !== true) {
  throw new Error('smoke evidence does not record the accepted history and viewport stress result')
}
if (buildingSmoke.schema !== 'dsh-illusion/building-variety-smoke@1'
  || buildingSmoke.results?.filter((item) => item.status === 'complete').length !== 3
  || buildingSmoke.historyCards !== 12) {
  throw new Error('building variety smoke evidence is incomplete')
}

if (artCatalog.schema !== 'dsh-illusion/2d-art-style-benchmark@1' || !Array.isArray(artCatalog.cases)) {
  throw new Error('invalid 2D art style benchmark catalog')
}
const artFamilies = new Set(artCatalog.cases.map((item) => item.family))
for (const family of ['pixel', 'anime', 'custom']) {
  if (!artFamilies.has(family)) throw new Error(`2D art catalog is missing style family: ${family}`)
}
if (artAgentment.schema !== 'dsh-illusion/2d-art-agentment@1' || !Array.isArray(artAgentment.roles)) {
  throw new Error('invalid 2D art agentment contract')
}
if (!artAgentment.invariants?.includes('the author owns style intent')) {
  throw new Error('2D art agentment must preserve author style ownership')
}

console.log(`Validated ${catalog.cases.length} 3D catalog cases, ${artCatalog.cases.length} 2D style cases, ${smoke.results.length} category smokes, ${buildingSmoke.results.length} building smokes, and ${agentment.roles.length + artAgentment.roles.length} agent roles.`)
