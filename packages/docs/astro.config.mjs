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
          items: [
            { label: 'Config File', slug: 'configuration/config-file' },
            { label: 'Views', slug: 'configuration/views' },
            { label: 'Settings', slug: 'configuration/settings' },
          ],
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
            { label: 'Types', slug: 'bridge/types' },
            {
              label: 'File System',
              items: [
                { label: 'listProjectFiles', slug: 'bridge/list-project-files' },
                { label: 'readProjectFile', slug: 'bridge/read-project-file' },
                { label: 'writeProjectFile', slug: 'bridge/write-project-file' },
                { label: 'openFile', slug: 'bridge/open-file' },
              ],
            },
            {
              label: 'Editor & IDE',
              items: [
                { label: 'getActiveEditor', slug: 'bridge/get-active-editor' },
                { label: 'getDiagnostics', slug: 'bridge/get-diagnostics' },
                { label: 'getTheme', slug: 'bridge/get-theme' },
                { label: 'getTarget', slug: 'bridge/get-target' },
                { label: 'executeCommand', slug: 'bridge/execute-command' },
                {
                  label: 'openInSimpleBrowser',
                  slug: 'bridge/open-in-simple-browser',
                },
                { label: 'openDiff', slug: 'bridge/open-diff' },
              ],
            },
            {
              label: 'UI & Interaction',
              items: [
                { label: 'notify', slug: 'bridge/notify' },
                { label: 'showQuickPick', slug: 'bridge/show-quick-pick' },
                { label: 'getClipboard / setClipboard', slug: 'bridge/clipboard' },
              ],
            },
            {
              label: 'Shell & Processes',
              items: [
                { label: 'runCommand', slug: 'bridge/run-command' },
                { label: 'runScript', slug: 'bridge/run-script' },
                { label: 'spawnProcess', slug: 'bridge/spawn-process' },
              ],
            },
            { label: 'Settings', slug: 'bridge/settings' },
            { label: 'Troubleshooting', slug: 'bridge/troubleshooting' },
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
