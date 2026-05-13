import { cpSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))

for (const target of ['vscode', 'jetbrains']) {
  const src = join(root, '../src/targets', target, 'actions')
  const dest = join(root, '../dist/targets', target, 'actions')
  mkdirSync(dest, { recursive: true })
  try {
    cpSync(src, dest, { recursive: true })
  } catch {
    // no actions folder — skip
  }
}
