import { bridge } from '../index.js'

export interface QuickPickItem {
  label: string
  description?: string
  detail?: string
  value?: string
}

export interface QuickPickOptions {
  placeholder?: string
  title?: string
  canPickMany?: boolean
}

export interface QuickPickResult {
  selected: QuickPickItem | QuickPickItem[] | null
}

export async function showQuickPick(
  items: string[] | QuickPickItem[],
  options?: QuickPickOptions,
): Promise<QuickPickResult> {
  const normalizedItems: QuickPickItem[] = items.map((item) =>
    typeof item === 'string' ? { label: item, value: item } : item,
  )

  return bridge.request<QuickPickResult>('show-quick-pick', {
    items: normalizedItems,
    ...(options ? { options } : {}),
  })
}
