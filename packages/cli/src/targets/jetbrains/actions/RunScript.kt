fun handleRunScript(payload: org.json.JSONObject?, reply: org.json.JSONObject) {
    if (payload == null) return
    val name = payload.optString("name", "")
    val scriptPayload = payload.opt("payload")
    val scriptName = if (name.endsWith(".js")) name else "$name.js"

    // Extract script from classpath resources to a temp dir and run it
    val tmpDir = java.io.File(System.getProperty("java.io.tmpdir"), "unextension-scripts")
    tmpDir.mkdirs()
    val outFile = java.io.File(tmpDir, scriptName)
    val stream = object {}.javaClass.getResourceAsStream("/scripts/$scriptName")

    if (stream == null) {
        reply.put("type", "run-script:reply")
        val replyPayload = org.json.JSONObject()
        replyPayload.put("result", org.json.JSONObject.NULL)
        replyPayload.put("exitCode", 1)
        replyPayload.put("stderr", "Script not found: $scriptName")
        reply.put("payload", replyPayload)
        return
    }
    stream.use { it.copyTo(outFile.outputStream()) }

    val inputJson = scriptPayload?.toString() ?: "null"
    val nodePath = resolveNode()
    val proc = ProcessBuilder(nodePath, outFile.absolutePath)
        .apply { environment()["UNEXTENSION_PAYLOAD"] = inputJson }
        .redirectErrorStream(false)
        .start()
    val stdout = proc.inputStream.bufferedReader().readText()
    val stderr = proc.errorStream.bufferedReader().readText()
    val exitCode = proc.waitFor()

    var result: Any = org.json.JSONObject.NULL
    try { result = org.json.JSONObject(stdout.trim()) } catch (_: Exception) {
        try { result = org.json.JSONArray(stdout.trim()) } catch (_: Exception) {
            result = stdout.trim()
        }
    }

    reply.put("type", "run-script:reply")
    val replyPayload = org.json.JSONObject()
    replyPayload.put("result", result as Any)
    replyPayload.put("exitCode", exitCode)
    replyPayload.put("stderr", stderr)
    reply.put("payload", replyPayload)
}

fun resolveNode(): String {
    val candidates = if (System.getProperty("os.name").lowercase().contains("win"))
        listOf("node.exe", "C:\\Program Files\\nodejs\\node.exe")
    else
        listOf("node", "/usr/local/bin/node", "/usr/bin/node")
    return candidates.firstOrNull { java.io.File(it).exists() || runCatching {
        ProcessBuilder("which", it).start().waitFor() == 0
    }.getOrDefault(false) } ?: "node"
}
