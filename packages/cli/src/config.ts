export interface JetBrainsConfig {
  /** Open Chrome DevTools automatically (set internally by `unextension dev`) */
  _devMode?: boolean
  /** Download the Gradle wrapper jar during sync (default: true) */
  downloadGradleWrapper?: boolean
  /** IntelliJ IDEA Community version to build against (default: '2024.3') */
  ideVersion?: string
  /** Gradle version for the wrapper (default: '8.7') */
  gradleVersion?: string
  /** org.jetbrains.kotlin.jvm plugin version (default: '2.1.0') */
  kotlinVersion?: string
  /** org.jetbrains.intellij.platform plugin version (default: '2.2.1') */
  intellijPlatformVersion?: string
  /** JVM toolchain version (default: 21) */
  jvmTarget?: number
  /** Gradle group id (default: 'com.unextension') */
  group?: string
  /**
   * Maximum IDE build number the plugin is compatible with.
   * Set to a specific build (e.g. '251.*') to restrict compatibility.
   * Set to null or omit to allow all future IDE versions (default: null — no upper bound).
   */
  untilBuild?: string | null
}

export interface VSCodeConfig {
  /** Minimum VS Code engine version (default: '>=1.85.0') */
  engineVersion?: string
  /** @types/vscode version (default: '^1.85.0') */
  typesVscodeVersion?: string
  /** @vscode/vsce version (default: '^3.0.0') */
  vsceVersion?: string
}

export type ViewLocation =
  | 'sidebar'
  | 'panel' // JetBrains: bottom tool window; VS Code: status bar item that opens a webview panel
  | 'editor'

export interface ViewConfig {
  /** Unique identifier for this view (kebab-case) */
  id: string
  /** Human-readable title shown in the IDE */
  title: string
  /** Web route pattern this view should load, e.g. '/toolbar' or '/toolbar/*' */
  route: string
  /** Where to place the view in the IDE (default: 'sidebar') */
  location?: ViewLocation
  /** Path to an SVG icon file relative to the project root. If omitted a default icon is generated. */
  icon?: string
}

export interface UnextensionConfig {
  /** Extension identifier (kebab-case) */
  name: string
  /** Human-readable name */
  displayName: string
  /** Semver version */
  version: string
  /** Publisher name (required for VS Code Marketplace publishing) */
  publisher?: string
  /** Short description */
  description?: string
  /** Repository URL, e.g. 'https://github.com/user/repo' */
  repository?: string
  /** License identifier, e.g. 'MIT' (default: 'MIT') */
  license?: string
  /** Path to an SVG icon for the plugin/extension (used as JetBrains pluginIcon, VS Code activity bar icon) */
  icon?: string
  /** Path to the built web app (default: './dist') */
  distDir?: string
  /**
   * Path to a folder of Node.js scripts that can be called from the webview via `runScript(name, payload)`.
   * Scripts receive the payload as a parsed object and must export a default async function.
   * They are copied to the extension output and executed in a sandboxed Node.js process.
   */
  scriptsDir?: string
  /**
   * Enable SPA mode. All views share a single shell HTML; the active route is set via window.__UNEXTENSION_ROUTE__.
   * - true: uses 'index.html' as the shell
   * - { shellPath: '_shell.html' }: uses a custom shell file relative to distDir
   */
  spa?: boolean | { shellPath: string }
  /**
   * Path to the SSR server entry relative to distDir (e.g. 'server/server.js').
   * When set, the extension starts this server and loads views via http://localhost:serverPort.
   * When omitted, the extension loads static files from distDir/client/index.html.
   */
  serverEntry?: string
  /**
   * Port the SSR server listens on (default: 3000).
   * Only used when serverEntry is set.
   */
  serverPort?: number
  /** Target platforms to generate */
  targets?: Array<'vscode' | 'jetbrains'>
  /** IDE views / tool windows to register */
  views?: ViewConfig[]
  /** VS Code-specific options */
  vscode?: VSCodeConfig
  /** JetBrains-specific options */
  jetbrains?: JetBrainsConfig
}

export function defineConfig(config: UnextensionConfig): UnextensionConfig {
  return config
}
