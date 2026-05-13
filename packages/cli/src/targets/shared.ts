export function toPascalCase(str: string): string {
  return str.replace(/(^|[-_])([a-z])/g, (_, __, c) => c.toUpperCase())
}

export function defaultIconSvg(title: string): string {
  const letter = (title?.[0] ?? '?').toUpperCase()
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" font-size="12" fill="currentColor" stroke="none">${letter}</text></svg>`
}

export function defaultPluginIconSvg(title: string): string {
  const letter = (title?.[0] ?? '?').toUpperCase()
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <rect width="40" height="40" rx="8" fill="#6c71c4"/>
  <text x="20" y="27" text-anchor="middle" font-size="22" font-family="sans-serif" font-weight="bold" fill="#ffffff">${letter}</text>
</svg>`
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
