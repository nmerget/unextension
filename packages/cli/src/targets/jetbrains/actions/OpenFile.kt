fun handleOpenFile(payload: org.json.JSONObject?, reply: org.json.JSONObject, project: Project) {
    val replyPayload = org.json.JSONObject()
    reply.put("type", "open-file:reply")

    if (payload == null) {
        replyPayload.put("success", false)
        reply.put("payload", replyPayload)
        return
    }

    val filePath = payload.optString("path", "")
    val basePath = project.basePath ?: ""
    val file = java.io.File(basePath, filePath)

    if (!file.exists() || !file.isFile) {
        replyPayload.put("success", false)
        reply.put("payload", replyPayload)
        return
    }

    val virtualFile = com.intellij.openapi.vfs.LocalFileSystem.getInstance().findFileByIoFile(file)
    if (virtualFile == null) {
        replyPayload.put("success", false)
        reply.put("payload", replyPayload)
        return
    }

    com.intellij.openapi.application.ApplicationManager.getApplication().invokeLater {
        val editor = com.intellij.openapi.fileEditor.FileEditorManager.getInstance(project).openFile(virtualFile, true)

        val textEditor = editor.filterIsInstance<com.intellij.openapi.fileEditor.TextEditor>().firstOrNull()
        if (textEditor != null) {
            val caretModel = textEditor.editor.caretModel
            val selectionModel = textEditor.editor.selectionModel
            val document = textEditor.editor.document

            val startLine = payload.optInt("startLine", -1)
            val startColumn = payload.optInt("startColumn", -1)
            val endLine = payload.optInt("endLine", -1)
            val endColumn = payload.optInt("endColumn", -1)

            if (startLine > 0 && startColumn > 0 && endLine > 0 && endColumn > 0) {
                val startOffset = document.getLineStartOffset(startLine - 1) + (startColumn - 1)
                val endOffset = document.getLineStartOffset(endLine - 1) + (endColumn - 1)
                caretModel.moveToOffset(startOffset)
                selectionModel.setSelection(startOffset, endOffset)
            } else {
                val line = payload.optInt("line", 1)
                val column = payload.optInt("column", 1)
                val offset = document.getLineStartOffset(line - 1) + (column - 1)
                caretModel.moveToOffset(offset)
            }
        }
    }

    replyPayload.put("success", true)
    reply.put("payload", replyPayload)
}
