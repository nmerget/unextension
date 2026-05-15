fun handleProcessSend(payload: org.json.JSONObject?, reply: org.json.JSONObject) {
    val processId = payload?.optString("processId", "") ?: ""
    val data = payload?.optString("data", "") ?: ""
    val process = jbProcessRegistry[processId]

    reply.put("type", "process-send:reply")
    val replyPayload = org.json.JSONObject()

    if (process == null) {
        replyPayload.put("success", false)
    } else {
        process.outputStream.write(data.toByteArray())
        process.outputStream.flush()
        replyPayload.put("success", true)
    }
    reply.put("payload", replyPayload)
}
