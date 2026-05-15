fun handleProcessKill(payload: org.json.JSONObject?, reply: org.json.JSONObject) {
    val processId = payload?.optString("processId", "") ?: ""
    val process = jbProcessRegistry[processId]

    reply.put("type", "process-kill:reply")
    val replyPayload = org.json.JSONObject()

    if (process == null) {
        replyPayload.put("success", false)
    } else {
        process.destroyForcibly()
        jbProcessRegistry.remove(processId)
        replyPayload.put("success", true)
    }
    reply.put("payload", replyPayload)
}
