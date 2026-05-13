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
})
