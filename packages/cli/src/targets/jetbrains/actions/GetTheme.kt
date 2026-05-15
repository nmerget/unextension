fun handleGetTheme(payload: org.json.JSONObject?, reply: org.json.JSONObject) {
    val isDark = com.intellij.util.ui.StartupUiUtil.isDarkTheme
    val colorScheme = if (isDark) "dark" else "light"

    val colorMap = mapOf(
        "background" to "Panel.background",
        "foreground" to "Panel.foreground",
        "inputBackground" to "TextField.background",
        "inputForeground" to "TextField.foreground",
        "border" to "Separator.foreground",
        "selectionBackground" to "List.selectionBackground",
        "selectionForeground" to "List.selectionForeground",
        "link" to "Hyperlink.linkColor",
        "buttonBackground" to "Button.default.startBackground",
        "buttonForeground" to "Button.default.foreground"
    )

    val colors = org.json.JSONObject()
    for ((key, uiKey) in colorMap) {
        val color = javax.swing.UIManager.getColor(uiKey)
        if (color != null) {
            colors.put(key, String.format("#%02x%02x%02x", color.red, color.green, color.blue))
        }
    }

    reply.put("type", "get-theme:reply")
    val replyPayload = org.json.JSONObject()
    replyPayload.put("colorScheme", colorScheme)
    replyPayload.put("colors", colors)
    reply.put("payload", replyPayload)
}
