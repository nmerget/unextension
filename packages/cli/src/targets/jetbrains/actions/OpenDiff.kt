fun handleOpenDiff(payload: org.json.JSONObject?, reply: org.json.JSONObject, project: Project, browser: JBCefBrowser) {
    if (payload == null) {
        reply.put("type", "open-diff:reply")
        val replyPayload = org.json.JSONObject()
        replyPayload.put("accepted", false)
        replyPayload.put("hunks", org.json.JSONObject.NULL)
        reply.put("payload", replyPayload)
        return
    }

    val filePath = payload.optString("filePath", "")
    val originalContentParam = payload.optString("originalContent", "")
    val modifiedContent = payload.optString("modifiedContent", "")
    val title = payload.optString("title",
        if (filePath.isNotEmpty()) filePath.substringAfterLast('/') else "Diff")
    val autoApply = if (payload.has("autoApply")) payload.getBoolean("autoApply") else true
    val correlationId = reply.optString("correlationId", "")

    // Resolve original content: originalContent takes precedence over filePath
    val resolvedOriginal = if (originalContentParam.isNotEmpty()) {
        originalContentParam
    } else if (filePath.isNotEmpty()) {
        val resolvedPath = if (java.io.File(filePath).isAbsolute) {
            filePath
        } else {
            val basePath = project.basePath ?: ""
            "$basePath/$filePath"
        }
        val vFile = com.intellij.openapi.vfs.LocalFileSystem.getInstance()
            .findFileByPath(resolvedPath)
        if (vFile != null) {
            String(vFile.contentsToByteArray(), Charsets.UTF_8)
        } else {
            // File not found — reply with rejection
            reply.put("type", "open-diff:reply")
            val replyPayload = org.json.JSONObject()
            replyPayload.put("accepted", false)
            replyPayload.put("hunks", org.json.JSONObject.NULL)
            reply.put("payload", replyPayload)
            return
        }
    } else {
        ""
    }

    // Clear correlationId so the synchronous handler doesn't send a premature reply
    reply.remove("correlationId")

    // Create diff contents
    val originalDoc = com.intellij.diff.contents.DocumentContentImpl(
        com.intellij.openapi.editor.EditorFactory.getInstance()
            .createDocument(resolvedOriginal)
    )
    val modifiedDoc = com.intellij.diff.contents.DocumentContentImpl(
        com.intellij.openapi.editor.EditorFactory.getInstance()
            .createDocument(modifiedContent)
    )

    val diffRequest = com.intellij.diff.requests.SimpleDiffRequest(
        title, originalDoc, modifiedDoc, "Original", "Modified"
    )

    // Helper to send async reply via browser JS injection
    fun sendAsyncReply(accepted: Boolean, includeContent: Boolean) {
        val asyncReply = org.json.JSONObject()
        if (correlationId.isNotEmpty()) asyncReply.put("correlationId", correlationId)
        asyncReply.put("type", "open-diff:reply")
        val asyncPayload = org.json.JSONObject()
        asyncPayload.put("accepted", accepted)
        asyncPayload.put("hunks", org.json.JSONObject.NULL)
        if (includeContent) {
            asyncPayload.put("content", modifiedContent)
        }
        asyncReply.put("payload", asyncPayload)

        val json = asyncReply.toString().replace("\\", "\\\\").replace("'", "\\'")
        val js = "window.dispatchEvent(new MessageEvent('message', { data: JSON.parse('$json') }));"
        browser.cefBrowser.executeJavaScript(js, browser.cefBrowser.url, 0)
    }

    // Open the diff viewer on the EDT, then show Accept/Reject notification
    com.intellij.openapi.application.ApplicationManager.getApplication().invokeLater {
        com.intellij.diff.DiffManager.getInstance().showDiff(project, diffRequest)

        // Show a notification with Accept/Reject actions
        val notification = com.intellij.notification.NotificationGroupManager.getInstance()
            .getNotificationGroup("unextension")
            .createNotification(
                "Review Diff: $title",
                "Accept or reject the proposed changes.",
                com.intellij.notification.NotificationType.INFORMATION
            )

        notification.addAction(com.intellij.notification.NotificationAction.createSimple("Accept") {
            // Handle autoApply logic
            if (autoApply && filePath.isNotEmpty()) {
                val resolvedPath = if (java.io.File(filePath).isAbsolute) {
                    filePath
                } else {
                    val basePath = project.basePath ?: ""
                    "$basePath/$filePath"
                }
                try {
                    val vFile = com.intellij.openapi.vfs.LocalFileSystem.getInstance()
                        .findFileByPath(resolvedPath)
                    if (vFile != null) {
                        com.intellij.openapi.application.ApplicationManager.getApplication().runWriteAction {
                            vFile.setBinaryContent(modifiedContent.toByteArray(Charsets.UTF_8))
                        }
                    }
                } catch (ex: Exception) {
                    println("[unextension] Failed to write file: ${ex.message}")
                }
            }
            sendAsyncReply(true, autoApply && filePath.isEmpty())
            notification.expire()
        })

        notification.addAction(com.intellij.notification.NotificationAction.createSimple("Reject") {
            sendAsyncReply(false, false)
            notification.expire()
        })

        notification.notify(project)
    }
}
