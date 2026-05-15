fun handleSetClipboard(payload: org.json.JSONObject?, reply: org.json.JSONObject) {
    val text = payload?.optString("text", "") ?: ""
    val success = try {
        val clipboard = java.awt.Toolkit.getDefaultToolkit().systemClipboard
        val selection = java.awt.datatransfer.StringSelection(text)
        clipboard.setContents(selection, null)
        true
    } catch (e: Exception) {
        false
    }
    reply.put("type", "set-clipboard:reply")
    val replyPayload = org.json.JSONObject()
    replyPayload.put("success", success)
    reply.put("payload", replyPayload)
}
