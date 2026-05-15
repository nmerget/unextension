fun handleGetActiveEditor(payload: org.json.JSONObject?, reply: org.json.JSONObject, project: Project) {
    com.intellij.openapi.application.ApplicationManager.getApplication().runReadAction {
        val fileEditorManager = com.intellij.openapi.fileEditor.FileEditorManager.getInstance(project)
        val editor = fileEditorManager.selectedTextEditor

        if (editor == null) {
            reply.put("type", "get-active-editor:reply")
            reply.put("payload", org.json.JSONObject.NULL)
            return@runReadAction
        }

        val document = editor.document
        val virtualFile = com.intellij.openapi.fileEditor.FileDocumentManager.getInstance().getFile(document)
        val projectPath = project.basePath ?: ""

        val absolutePath = virtualFile?.path ?: ""
        val relativePath = if (projectPath.isNotEmpty() && absolutePath.startsWith(projectPath)) {
            absolutePath.removePrefix(projectPath).removePrefix("/")
        } else {
            absolutePath
        }

        val language = virtualFile?.fileType?.name?.lowercase() ?: ""

        val selectionModel = editor.selectionModel
        val caretModel = editor.caretModel
        val caret = caretModel.primaryCaret

        val hasSelection = selectionModel.hasSelection()

        val startOffset = if (hasSelection) selectionModel.selectionStart else caret.offset
        val endOffset = if (hasSelection) selectionModel.selectionEnd else caret.offset

        val startLine = document.getLineNumber(startOffset)
        val startColumn = startOffset - document.getLineStartOffset(startLine)
        val endLine = document.getLineNumber(endOffset)
        val endColumn = endOffset - document.getLineStartOffset(endLine)

        val replyPayload = org.json.JSONObject()
        replyPayload.put("relativePath", relativePath)
        replyPayload.put("absolutePath", absolutePath)
        replyPayload.put("language", language)
        replyPayload.put("startLine", startLine)
        replyPayload.put("startColumn", startColumn)
        replyPayload.put("endLine", endLine)
        replyPayload.put("endColumn", endColumn)

        if (hasSelection) {
            replyPayload.put("selection", selectionModel.selectedText ?: "")
        }

        val includeContent = payload?.optBoolean("includeContent", false) ?: false
        if (includeContent) {
            replyPayload.put("content", document.text)
        }

        reply.put("type", "get-active-editor:reply")
        reply.put("payload", replyPayload)
    }
}
