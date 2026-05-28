import { defineConfig } from '@unextension/cli'

export default defineConfig({
  name: 'unextension-showcase',
  displayName: 'Unextension Showcase',
  publisher: 'unextension',
  version: '0.0.1',
  description: 'A demo IDE extension built with unextension',
  icon: './src/assets/icon.svg',
  distDir: './dist',
  spa: true,
  scriptsDir: './dist/scripts',
  targets: ['vscode', 'jetbrains'],
  jetbrains: {
    ideVersion: '2025.1',
  },
  views: [
    {
      id: 'explorer',
      title: 'Showcase Explorer',
      route: '/',
      location: 'sidebar',
      icon: './src/assets/icon.svg',
    },
    {
      id: 'panel',
      title: 'Showcase Panel',
      route: '/panel',
      location: 'panel',
    },
  ],
  settings: [
    {
      key: 'editor.fontFamily',
      type: 'string',
      default: 'Consolas',
      description: 'Font family used in the editor',
      title: 'Font Family',
    },
    {
      key: 'editor.fontSize',
      type: 'number',
      default: 14,
      description: 'Font size in pixels for the editor',
      title: 'Font Size',
    },
    {
      key: 'editor.wordWrap',
      type: 'boolean',
      default: true,
      description: 'Controls whether lines should wrap at the viewport width',
      title: 'Word Wrap',
    },
    {
      key: 'editor.theme',
      type: 'enum',
      default: 'dark',
      options: ['light', 'dark', 'auto'],
      description: 'Color theme for the editor',
      title: 'Theme',
    },
    {
      key: 'workspace.autoSave',
      type: 'boolean',
      default: false,
      description: 'Automatically save files in this workspace',
      title: 'Auto Save',
      scope: 'workspace',
    },
  ],
})
