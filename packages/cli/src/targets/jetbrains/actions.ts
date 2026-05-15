import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const actionsDir = join(dirname(fileURLToPath(import.meta.url)), 'actions')

interface Action {
  type: string
  fnName: string
  body: string
  needsProject: boolean
  needsBrowser: boolean
}

function pascalToKebab(s: string): string {
  return s.replace(/([A-Z])/g, (_, c, i) => (i > 0 ? '-' : '') + c.toLowerCase())
}

function loadActions(): Action[] {
  return readdirSync(actionsDir)
    .filter((f) => f.endsWith('.kt'))
    .sort()
    .map((f) => {
      const name = basename(f, '.kt')
      const fnName = `handle${name}`
      const type = pascalToKebab(name)
      const body = readFileSync(join(actionsDir, f), 'utf8').trim()
      const needsProject = body.includes(', project: Project')
      const needsBrowser = body.includes(', browser: JBCefBrowser')
      return { type, fnName, body, needsProject, needsBrowser }
    })
}

export interface KotlinActions {
  /** Private fun declarations to embed as class members */
  functions: string
  /** if/else if dispatch chain to embed in the message handler */
  dispatch: string
  /** Whether any action needs the process registry (spawn-process support) */
  needsProcessRegistry: boolean
}

export function generateKotlinActions(): KotlinActions {
  const actions = loadActions()

  const needsProcessRegistry = actions.some(
    (a) => a.body.includes('jbProcessRegistry') || a.body.includes('postStreamEvent'),
  )

  const functions = actions
    .map((a) =>
      a.body
        .split('\n')
        .map((l) => '    ' + l)
        .join('\n'),
    )
    .join('\n\n')

  const dispatch =
    actions
      .map((a, i) => {
        const call = `${a.fnName}(payload, reply${a.needsProject ? ', project' : ''}${a.needsBrowser ? ', browser' : ''})`
        const cond = `type == "${a.type}"`
        return i === 0 ? `if (${cond}) { ${call} }` : `else if (${cond}) { ${call} }`
      })
      .join('\n                ') +
    `\n                else {\n                    reply.put("type", "$type:reply")\n                    val replyPayload = org.json.JSONObject()\n                    replyPayload.put("received", true)\n                    replyPayload.put("echo", parsed.opt("payload"))\n                    reply.put("payload", replyPayload)\n                }`

  return { functions, dispatch, needsProcessRegistry }
}
