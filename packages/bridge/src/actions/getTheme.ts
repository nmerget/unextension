import { bridge } from '../index.js'

export interface ThemeColors {
  background?: string
  foreground?: string
  inputBackground?: string
  inputForeground?: string
  border?: string
  selectionBackground?: string
  selectionForeground?: string
  link?: string
  buttonBackground?: string
  buttonForeground?: string
}

export interface ThemeResult {
  colorScheme: 'dark' | 'light'
  colors: ThemeColors
}

export async function getTheme(): Promise<ThemeResult> {
  return bridge.request<ThemeResult>('get-theme')
}
