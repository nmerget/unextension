import { cosmiconfig } from 'cosmiconfig'
import { TypeScriptLoader } from 'cosmiconfig-typescript-loader'
import type { UnextensionConfig } from './config.js'

const MODULE_NAME = 'unextension'

export async function loadConfig(cwd: string): Promise<UnextensionConfig> {
  const explorer = cosmiconfig(MODULE_NAME, {
    searchPlaces: [
      `${MODULE_NAME}.config.ts`,
      `${MODULE_NAME}.config.js`,
      `${MODULE_NAME}.config.mjs`,
      `${MODULE_NAME}.config.json`,
      `${MODULE_NAME}.config.yaml`,
      `${MODULE_NAME}.config.yml`,
      `.${MODULE_NAME}rc`,
      `.${MODULE_NAME}rc.json`,
      `.${MODULE_NAME}rc.yaml`,
      'package.json',
    ],
    loaders: {
      '.ts': TypeScriptLoader(),
    },
  })

  const result = await explorer.search(cwd)
  if (!result || result.isEmpty) {
    throw new Error(
      `No unextension config found. Create an unextension.config.ts in your project root.`
    )
  }

  return result.config as UnextensionConfig
}
