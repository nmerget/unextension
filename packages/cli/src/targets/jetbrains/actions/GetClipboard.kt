fun handleGetClipboard(payload: org.json.JSONObject?, reply: org.json.JSONObject) {
    val clipboard = java.awt.Toolkit.getDefaultToolkit().systemClipboard
    val text = try {
        val contents = clipboard.getContents(null)
        if (contents != null && contents.isDataFlavorSupported(java.awt.datatransfer.DataFlavor.stringFlavor)) {
            contents.getTransferData(java.awt.datatransfer.DataFlavor.stringFlavor) as String
        } else {
            ""
        }
    } catch (e: Exception) {
        ""
    }
    reply.put("type", "get-clipboard:reply")
    val replyPayload = org.json.JSONObject()
    replyPayload.put("text", text)
    reply.put("payload", replyPayload)
}
