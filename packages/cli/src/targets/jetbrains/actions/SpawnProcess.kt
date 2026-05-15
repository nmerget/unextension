fun handleSpawnProcess(payload: org.json.JSONObject?, reply: org.json.JSONObject, browser: JBCefBrowser) {
    if (payload == null) {
        reply.put("type", "spawn-process:reply")
        val replyPayload = org.json.JSONObject()
        replyPayload.put("error", "Missing payload")
        reply.put("payload", replyPayload)
        return
    }

    val command = payload.optString("command", "")
    val args = payload.optJSONArray("args")?.let { arr ->
        (0 until arr.length()).map { arr.getString(it) }
    } ?: emptyList()
    val cwd = payload.optString("cwd", "")
    val env = payload.optJSONObject("env")

    val processId = "proc_" + java.util.UUID.randomUUID().toString().take(12)

    try {
        val cmdList = mutableListOf(command).apply { addAll(args) }
        val pb = ProcessBuilder(cmdList)
        if (cwd.isNotEmpty()) pb.directory(java.io.File(cwd))
        if (env != null) {
            val environment = pb.environment()
            for (key in env.keys()) {
                environment[key] = env.getString(key)
            }
        }

        val process = pb.start()
        jbProcessRegistry[processId] = process

        reply.put("type", "spawn-process:reply")
        val replyPayload = org.json.JSONObject()
        replyPayload.put("processId", processId)
        replyPayload.put("pid", process.pid())
        reply.put("payload", replyPayload)

        // Read stdout on background thread
        Thread {
            try {
                val reader = process.inputStream.bufferedReader()
                val buffer = CharArray(4096)
                var read: Int
                while (reader.read(buffer).also { read = it } != -1) {
                    val chunk = String(buffer, 0, read)
                    postStreamEvent(browser, processId, "stdout", chunk)
                }
            } catch (_: Exception) {}
        }.start()

        // Read stderr on background thread
        Thread {
            try {
                val reader = process.errorStream.bufferedReader()
                val buffer = CharArray(4096)
                var read: Int
                while (reader.read(buffer).also { read = it } != -1) {
                    val chunk = String(buffer, 0, read)
                    postStreamEvent(browser, processId, "stderr", chunk)
                }
            } catch (_: Exception) {}
        }.start()

        // Wait for exit on background thread
        Thread {
            val exitCode = process.waitFor()
            postStreamEvent(browser, processId, "exit", null, exitCode)
            jbProcessRegistry.remove(processId)
        }.start()

    } catch (e: Exception) {
        reply.put("type", "spawn-process:reply")
        val replyPayload = org.json.JSONObject()
        replyPayload.put("error", e.message ?: "Failed to spawn process")
        reply.put("payload", replyPayload)
    }
}
