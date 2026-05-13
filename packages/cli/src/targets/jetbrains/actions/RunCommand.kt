fun handleRunCommand(payload: org.json.JSONObject?, reply: org.json.JSONObject) {
    if (payload == null) return
    val command = payload.optString("command", "")
    val requestedShell = payload.optString("shell", "")
    val isWindows = System.getProperty("os.name").lowercase().contains("win")
    val (shell, flag) = resolveShell(requestedShell, isWindows)
    val result = runShellCommand(command, shell, flag)
    reply.put("type", "run-command:reply")
    val replyPayload = org.json.JSONObject()
    replyPayload.put("command", command)
    replyPayload.put("stdout", result.first)
    replyPayload.put("stderr", result.second)
    replyPayload.put("exitCode", result.third)
    reply.put("payload", replyPayload)
}

fun resolveShell(requested: String, isWindows: Boolean): Pair<String, String> = when (requested) {
    "cmd"        -> Pair("cmd", "/c")
    "powershell" -> Pair("powershell", "-Command")
    "bash"       -> Pair("bash", "-c")
    "sh"         -> Pair("sh", "-c")
    "zsh"        -> Pair("zsh", "-c")
    "fish"       -> Pair("fish", "-c")
    else         -> if (isWindows) Pair("cmd", "/c") else Pair("sh", "-c")
}
