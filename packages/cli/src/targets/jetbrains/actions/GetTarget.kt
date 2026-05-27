fun handleGetTarget(payload: org.json.JSONObject?, reply: org.json.JSONObject) {
    val appInfo = com.intellij.openapi.application.ApplicationInfo.getInstance()
    val name = appInfo.fullApplicationName
    val version = appInfo.fullVersion

    reply.put("type", "get-target:reply")
    val replyPayload = org.json.JSONObject()
    replyPayload.put("target", "jetbrains")
    replyPayload.put("name", name)
    replyPayload.put("version", version)
    reply.put("payload", replyPayload)
}
