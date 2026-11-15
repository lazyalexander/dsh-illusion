import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const root = new URL('..', import.meta.url)
const failures = []

const textRules = [
  ['AWS access key', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['GitHub token', /\b(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9_]{20,})\b/],
  ['provider-style secret', /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ['private key', new RegExp('-{5}BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-{5}')],
  ['credential-bearing URL', /[?&](?:token|access_token|api_key)=[A-Za-z0-9._~-]{12,}/i],
  ['bearer credential', /\bBearer\s+[A-Za-z0-9._~-]{16,}\b/i],
  ['macOS home path', /\/Users\/[A-Za-z0-9._-]+\//],
  ['Linux home path', /\/home\/[A-Za-z0-9._-]+\//],
  ['Windows home path', /[A-Za-z]:\\Users\\[^\\\s]+\\/i],
  ['non-noreply email', /\b[A-Z0-9._%+-]+@(?!users\.noreply\.github\.com\b)[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
]

const forbiddenPaths = [
  /(^|\/)\.DS_Store$/,
  /(^|\/)\.env(?:\..+)?$/,
  /(^|\/)\.npmrc$/,
  /(^|\/)(?:id_rsa|id_ed25519)$/,
  /\.(?:key|pem|p12|pfx)$/i,
]

function git(...args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: args.includes('-z') ? 'buffer' : 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
}

function splitZero(buffer) {
  return buffer.toString('utf8').split('\0').filter(Boolean)
}

function inspectPng(buffer, label) {
  if (buffer.length < 8 || buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') return

  const metadataChunks = new Set(['eXIf', 'iTXt', 'tEXt', 'zTXt'])
  let offset = 8
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    if (metadataChunks.has(type)) failures.push(`${label}: PNG contains metadata chunk ${type}`)
    offset += length + 12
    if (type === 'IEND') break
  }
}

function inspectBuffer(buffer, label, path) {
  if (forbiddenPaths.some((rule) => rule.test(path))) failures.push(`${label}: forbidden public path`)

  inspectPng(buffer, label)
  if (buffer.includes(0)) return

  const text = buffer.toString('utf8')
  for (const [name, rule] of textRules) {
    if (rule.test(text)) failures.push(`${label}: ${name}`)
  }
}

const workspacePaths = splitZero(git('ls-files', '--cached', '--others', '--exclude-standard', '-z'))
for (const path of workspacePaths) {
  inspectBuffer(readFileSync(new URL(path, root)), `workspace:${path}`, path)
}

const objects = git('rev-list', '--objects', '--all')
  .trim()
  .split('\n')
  .filter(Boolean)

const seen = new Set()
const blobCache = new Map()
for (const entry of objects) {
  const separator = entry.indexOf(' ')
  if (separator === -1) continue
  const oid = entry.slice(0, separator)
  const path = entry.slice(separator + 1)
  seen.add(oid)

  if (!blobCache.has(oid)) {
    if (git('cat-file', '-t', oid).trim() !== 'blob') continue
    blobCache.set(oid, execFileSync('git', ['cat-file', 'blob', oid], {
      cwd: root,
      encoding: 'buffer',
      maxBuffer: 64 * 1024 * 1024,
    }))
  }
  const buffer = blobCache.get(oid)
  inspectBuffer(buffer, `history:${oid.slice(0, 12)}:${path}`, path)
}

if (failures.length > 0) {
  console.error('Public repository audit failed:')
  for (const failure of [...new Set(failures)].sort()) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(`Public repository audit passed (${workspacePaths.length} workspace files, ${seen.size} history objects).`)
}
