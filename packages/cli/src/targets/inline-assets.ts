import path from 'node:path'
import fs from 'fs-extra'

/**
 * Reads index.html files under webviewDir and inlines all referenced
 * <script src="..."> and <link rel="stylesheet" href="..."> assets directly
 * into the HTML, producing a fully self-contained file.
 */
export async function inlineWebviewAssets(webviewDir: string) {
  async function inlineHtml(htmlPath: string) {
    let html = await fs.readFile(htmlPath, 'utf8')

    // Inline <link rel="stylesheet" href="...">
    html = await replaceAsync(html, /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi, async (match, href) => {
      const abs = resolveHref(htmlPath, webviewDir, href)
      if (!abs) return match
      const css = await fs.readFile(abs, 'utf8')
      return `<style>${css}</style>`
    })

    // Also handle href-before-rel ordering
    html = await replaceAsync(html, /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*\/?>/gi, async (match, href) => {
      const abs = resolveHref(htmlPath, webviewDir, href)
      if (!abs) return match
      const css = await fs.readFile(abs, 'utf8')
      return `<style>${css}</style>`
    })

    // Remove modulepreload links
    html = html.replace(/<link[^>]+rel=["']modulepreload["'][^>]*\/?>/gi, '')

    // Inline <script type="module" src="...">
    html = await replaceAsync(html, /<script([^>]*)\bsrc=["']([^"']+)["']([^>]*)><\/script>/gi, async (match, before, src, after) => {
      if (!/type=["']module["']/.test(before + after) && !/type=["']module["']/.test(match)) {
        // non-module scripts: still inline them
      }
      const abs = resolveHref(htmlPath, webviewDir, src)
      if (!abs) return match
      const js = await fs.readFile(abs, 'utf8')
      const safe = js.replace(/<\/script>/gi, '<\\/script>')
      return `<script>${safe}</script>`
    })

    await fs.writeFile(htmlPath, html)
  }

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else if (entry.name === 'index.html') {
        await inlineHtml(full)
      }
    }
  }

  await walk(webviewDir)
}

function resolveHref(htmlPath: string, webviewDir: string, href: string): string | null {
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('data:')) return null
  // Absolute path relative to webviewDir root
  const abs = href.startsWith('/')
    ? path.join(webviewDir, href)
    : path.resolve(path.dirname(htmlPath), href)
  return fs.existsSync(abs) ? abs : null
}

async function replaceAsync(str: string, regex: RegExp, replacer: (match: string, ...args: any[]) => Promise<string>): Promise<string> {
  const matches: Array<{ index: number; match: string; replacement: Promise<string> }> = []
  let m: RegExpExecArray | null
  const re = new RegExp(regex.source, regex.flags)
  while ((m = re.exec(str)) !== null) {
    matches.push({ index: m.index, match: m[0], replacement: replacer(m[0], ...m.slice(1)) })
  }
  const resolved = await Promise.all(matches.map(x => x.replacement))
  let result = ''
  let last = 0
  for (let i = 0; i < matches.length; i++) {
    result += str.slice(last, matches[i].index)
    result += resolved[i]
    last = matches[i].index + matches[i].match.length
  }
  result += str.slice(last)
  return result
}
