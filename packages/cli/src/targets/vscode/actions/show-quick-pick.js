// @ts-check
/// <reference path="./globals.js" />

/**
 * @param {{ items?: Array<{label: string, description?: string, detail?: string, value?: string}>, options?: {placeholder?: string, title?: string, canPickMany?: boolean} } | null} payload
 * @param {(result: { selected: {label: string, description?: string, detail?: string, value?: string} | Array<{label: string, description?: string, detail?: string, value?: string}> | null }) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @returns {Promise<void>}
 */
async function showQuickPick(payload, reply, channel) {
  const items = (payload?.items ?? []).map((item) => ({
    label: item.label,
    description: item.description ?? '',
    detail: item.detail ?? '',
    _value: item.value ?? item.label,
  }))

  const opts = {}
  if (payload?.options?.placeholder) opts.placeHolder = payload.options.placeholder
  if (payload?.options?.title) opts.title = payload.options.title
  if (payload?.options?.canPickMany) opts.canPickMany = true

  const result = await vscode.window.showQuickPick(items, opts)

  if (result === undefined) {
    reply({ selected: null })
    return
  }

  if (Array.isArray(result)) {
    reply({
      selected: result.map((r) => ({
        label: r.label,
        description: r.description || undefined,
        detail: r.detail || undefined,
        value: r._value,
      })),
    })
  } else {
    reply({
      selected: {
        label: result.label,
        description: result.description || undefined,
        detail: result.detail || undefined,
        value: result._value,
      },
    })
  }
}
