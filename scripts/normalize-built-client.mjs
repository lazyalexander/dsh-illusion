import { readFileSync, writeFileSync } from 'node:fs'

const clientPath = new URL('../lib/client.js', import.meta.url)
const source = readFileSync(clientPath, 'utf8')
const normalized = source.replace(/[ \t]+$/gm, '')

if (normalized !== source) writeFileSync(clientPath, normalized)
