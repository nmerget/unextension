---
title: JetBrains
description: How unextension generates and builds JetBrains plugins.
---

## Output structure

After running `unextension sync`, the `output/jetbrains/` directory contains:

```
output/jetbrains/
  build.gradle.kts
  gradlew
  gradlew.bat
  gradle/wrapper/
    gradle-wrapper.jar
    gradle-wrapper.properties
  src/main/
    kotlin/com/unextension/
      <Name>ToolWindowFactory.kt
    resources/
      META-INF/plugin.xml
      webview/            # Your built web app
```

## Requirements

- **Java 17 or higher** must be installed and available on your `PATH`

## Gradle wrapper

By default, `unextension sync` downloads the `gradle-wrapper.jar` automatically. You can disable this in your config:

```ts
export default defineConfig({
  // ...
  jetbrains: {
    downloadGradleWrapper: false,
  },
})
```

## Building

Run `unextension build jetbrains`:

```bash
npx unextension build jetbrains
```

This invokes the Gradle wrapper's `buildPlugin` task to compile and package the plugin. The output is a `.zip` file inside `output/jetbrains/build/distributions/`.

## Installing locally

### Via the UI

1. Open **Settings** → **Plugins** in your JetBrains IDE
2. Click the ⚙️ gear icon → **Install Plugin from Disk...**
3. Select the `.zip` file from `output/jetbrains/build/distributions/`
4. Restart the IDE when prompted

### Via the CLI (Gradle)

```bash
cd output/jetbrains
./gradlew runIde
```

This launches a sandboxed IDE instance with your plugin installed for testing.

## Publishing to the JetBrains Marketplace

### 1. Create a JetBrains account

Sign up at [plugins.jetbrains.com](https://plugins.jetbrains.com) and create a new plugin listing.

### 2. Get an upload token

Go to your [JetBrains Hub token page](https://hub.jetbrains.com/users/me?tab=authentications) and generate a **Permanent Token** with the `Plugin Repository` scope.

### 3. Upload via Gradle

Add the publish task to `output/jetbrains/build.gradle.kts`:

```kotlin
publishPlugin {
    token.set(System.getenv("JETBRAINS_TOKEN"))
}
```

Then run:

```bash
cd output/jetbrains
JETBRAINS_TOKEN=<your-token> ./gradlew publishPlugin
```

### 4. Upload manually

Alternatively, go to your plugin page on [plugins.jetbrains.com](https://plugins.jetbrains.com), click **Upload Update**, and select the `.zip` from `output/jetbrains/build/distributions/`.

:::tip
The first upload must be done manually via the website. Subsequent updates can be automated with `publishPlugin`.
:::
