import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const actionsDir = join(dirname(fileURLToPath(import.meta.url)), 'actions')

interface Action {
  type: string // message type, e.g. 'get-project-files'
  fnName: string // JS function name, e.g. 'getProjectFiles'
  body: string // full function source
}

function loadActions(): Action[] {
  return readdirSync(actionsDir)
    .filter((f) => f.endsWith('.js') && f !== 'globals.js')
    .sort()
    .map((f) => {
      const type = basename(f, '.js')
      const fnName = type.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      const body = readFileSync(join(actionsDir, f), 'utf8').trim()
      return { type, fnName, body }
    })
}

export function generateActions(): string {
  const actions = loadActions()

  const functions = actions.map((a) => a.body).join('\n\n')

  const cases = actions
    .map((a) => `    case '${a.type}': await ${a.fnName}(payload, reply, channel); break;`)
    .join('\n')

  return `${functions}

async function handleMessage(msg, webview, channel) {
  const { type, payload, correlationId } = msg ?? {};
  (channel || output).appendLine('[unextension] message: ' + type + ' ' + JSON.stringify(payload ?? {}));

  function reply(replyPayload) {
    webview.postMessage({ type: type + ':reply', payload: replyPayload, correlationId });
  }

  switch (type) {
${cases}
    default:
      console.warn('[unextension] unhandled message type:', type);
      reply({ received: true, echo: payload });
  }
}`
}
