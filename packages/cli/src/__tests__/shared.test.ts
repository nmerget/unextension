import { describe, it, expect } from 'vitest'
import { toPascalCase, escapeXml, defaultIconSvg, defaultPluginIconSvg } from '../targets/shared.js'

describe('toPascalCase', () => {
  it('converts kebab-case to PascalCase', () => {
    expect(toPascalCase('my-view')).toBe('MyView')
    expect(toPascalCase('explorer')).toBe('Explorer')
    expect(toPascalCase('my-long-view-name')).toBe('MyLongViewName')
  })

  it('handles single word', () => {
    expect(toPascalCase('panel')).toBe('Panel')
  })
})

describe('escapeXml', () => {
  it('escapes all XML special characters', () => {
    expect(escapeXml('a & b')).toBe('a &amp; b')
    expect(escapeXml('<tag>')).toBe('&lt;tag&gt;')
    expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;')
    expect(escapeXml("it's")).toBe('it&apos;s')
  })

  it('leaves plain strings unchanged', () => {
    expect(escapeXml('hello world')).toBe('hello world')
  })
})

describe('defaultIconSvg', () => {
  it('contains the first letter of the title', () => {
    const svg = defaultIconSvg('Explorer')
    expect(svg).toContain('E')
    expect(svg).toContain('<svg')
  })

  it('uses ? for empty title', () => {
    expect(defaultIconSvg('')).toContain('?')
  })
})

describe('defaultPluginIconSvg', () => {
  it('produces a 40x40 SVG with the first letter', () => {
    const svg = defaultPluginIconSvg('Bridge')
    expect(svg).toContain('width="40"')
    expect(svg).toContain('height="40"')
    expect(svg).toContain('B')
  })
})
