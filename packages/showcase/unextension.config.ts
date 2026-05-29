import { defineConfig } from '@unextension/cli'

export default defineConfig({
  name: 'unextension-showcase',
  displayName: 'Unextension Showcase',
  publisher: 'unextension',
  version: '0.0.1',
  description: 'A demo IDE extension built with unextension',
  icon: './src/assets/icon.svg',
  distDir: './dist',
  scriptsDir: './dist/scripts',
  targets: ['vscode', 'jetbrains'],
  jetbrains: {
    ideVersion: '2025.1',
  },
  views: [
    // sidebar: inline in the sidebar
    {
      id: 'sidebar-view',
      title: 'Sidebar View',
      route: '/',
      location: 'sidebar',
      icon: './src/assets/icon.svg',
    },
    // panel: inline in the bottom panel
    {
      id: 'panel-view',
      title: 'Panel View',
      route: '/panel',
      location: 'panel',
      icon: './src/assets/icon.svg',
    },
    // toolbar + editor: toolbar icon opens in editor area
    {
      id: 'toolbar-editor',
      title: 'Toolbar Editor',
      route: '/editor',
      location: 'toolbar',
      icon: './src/assets/icon.svg',
      toolbar: { openIn: 'editor', vsCodeIcon: 'browser' },
    },
    // toolbar + sidebar: toolbar icon opens in sidebar
    {
      id: 'toolbar-sidebar',
      title: 'Toolbar Sidebar',
      route: '/editor',
      location: 'toolbar',
      icon: './src/assets/icon.svg',
      toolbar: { openIn: 'sidebar', vsCodeIcon: 'preview' },
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
