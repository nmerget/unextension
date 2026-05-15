// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE,
  base: process.env.BASE,
  integrations: [
    starlight({
      title: 'unextension',
      favicon: '/favicon.ico',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/nmerget/unextension',
        },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'getting-started/introduction' },
            { label: 'Quick Start', slug: 'getting-started/quick-start' },
          ],
        },
        {
          label: 'Configuration',
          items: [{ label: 'Config File', slug: 'configuration/config-file' }],
        },
        {
          label: 'Targets',
          items: [
            { label: 'VS Code', slug: 'targets/vscode' },
            { label: 'JetBrains', slug: 'targets/jetbrains' },
          ],
        },
        {
          label: 'Bridge API',
          items: [
            { label: 'Overview', slug: 'bridge' },
            { label: 'Messaging', slug: 'bridge/messaging' },
            { label: 'Actions', slug: 'bridge/actions' },
            { label: 'Scripts', slug: 'bridge/scripts' },
            { label: 'Types', slug: 'bridge/types' },
            { label: 'Clipboard', slug: 'bridge/clipboard' },
            { label: 'getActiveEditor', slug: 'bridge/get-active-editor' },
            { label: 'getDiagnostics', slug: 'bridge/get-diagnostics' },
            { label: 'openFile', slug: 'bridge/open-file' },
            { label: 'showQuickPick', slug: 'bridge/show-quick-pick' },
          ],
        },
        {
          label: 'Reference',
          items: [{ label: 'CLI Commands', slug: 'reference/cli' }],
        },
      ],
    }),
  ],
})
