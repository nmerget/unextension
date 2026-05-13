import { build } from 'esbuild'
import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const outDir = join(scriptsDir, '../dist/scripts')

const entries = readdirSync(scriptsDir)
  .filter((f) => f.endsWith('.ts') && f !== 'build.mjs')
  .map((f) => join(scriptsDir, f))

if (entries.length > 0) {
  await build({
    entryPoints: entries,
    outdir: outDir,
    bundle: true, // inline all imports including @unextension/bridge/script
    platform: 'node',
    target: 'node18',
    format: 'cjs', // plain node can run it without --input-type
    external: [], // bundle everything — no node_modules needed at runtime
  })
  console.log(`  ✓ Bundled ${entries.length} script(s) → dist/scripts/`)
}
