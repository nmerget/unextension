fun handleGetDiagnostics(payload: org.json.JSONObject?, reply: org.json.JSONObject, project: Project) {
    com.intellij.openapi.application.ApplicationManager.getApplication().runReadAction {
        val filterPath = payload?.optString("path", null)
        val openFilesOnly = payload?.optBoolean("openFilesOnly", false) ?: false

        val diagnostics = org.json.JSONArray()
        val basePath = project.basePath ?: ""

        // Collect files to inspect
        val filesToInspect = if (openFilesOnly) {
            com.intellij.openapi.fileEditor.FileEditorManager.getInstance(project).openFiles.toList()
        } else if (filterPath != null) {
            val vf = com.intellij.openapi.vfs.LocalFileSystem.getInstance()
                .findFileByPath("$basePath/$filterPath")
            if (vf != null) listOf(vf) else emptyList()
        } else {
            collectProjectFiles(project)
        }

        for (vf in filesToInspect) {
            val relativePath = vf.path.removePrefix("$basePath/")

            // Apply path filter for openFilesOnly mode
            if (filterPath != null && relativePath != filterPath) continue

            val document = com.intellij.openapi.fileEditor.FileDocumentManager.getInstance().getDocument(vf) ?: continue

            // Use DocumentMarkupModel to get highlights compatible with IntelliJ 2025.1+
            val markupModel = com.intellij.openapi.editor.impl.DocumentMarkupModel.forDocument(document, project, false) ?: continue
            val highlighters = markupModel.allHighlighters

            for (highlighter in highlighters) {
                val info = com.intellij.codeInsight.daemon.impl.HighlightInfo.fromRangeHighlighter(highlighter) ?: continue
                if (info.severity.myVal < com.intellij.lang.annotation.HighlightSeverity.GENERIC_SERVER_ERROR_OR_WARNING.myVal) continue

                val entry = org.json.JSONObject()
                entry.put("file", relativePath)

                val startOffset = highlighter.startOffset
                val endOffset = highlighter.endOffset

                if (startOffset >= document.textLength) continue

                val startLine = document.getLineNumber(startOffset)
                val startColumn = startOffset - document.getLineStartOffset(startLine)
                entry.put("line", startLine + 1)
                entry.put("column", startColumn + 1)
                entry.put("message", info.description ?: "")
                entry.put("severity", mapSeverity(info.severity))

                if (endOffset > startOffset && endOffset <= document.textLength) {
                    val endLine = document.getLineNumber(endOffset)
                    val endColumn = endOffset - document.getLineStartOffset(endLine)
                    entry.put("endLine", endLine + 1)
                    entry.put("endColumn", endColumn + 1)
                }

                if (info.inspectionToolId != null) {
                    entry.put("source", info.inspectionToolId)
                }

                diagnostics.put(entry)
            }
        }

        reply.put("type", "get-diagnostics:reply")
        val replyPayload = org.json.JSONObject()
        replyPayload.put("diagnostics", diagnostics)
        reply.put("payload", replyPayload)
    }
}

fun collectProjectFiles(project: Project): List<com.intellij.openapi.vfs.VirtualFile> {
    val result = mutableListOf<com.intellij.openapi.vfs.VirtualFile>()
    val basePath = project.basePath ?: return result
    val root = com.intellij.openapi.vfs.LocalFileSystem.getInstance().findFileByPath(basePath) ?: return result
    val fileIndex = com.intellij.openapi.roots.ProjectRootManager.getInstance(project).fileIndex
    fileIndex.iterateContent { vf ->
        if (!vf.isDirectory) {
            result.add(vf)
        }
        true
    }
    return result
}

fun mapSeverity(severity: com.intellij.lang.annotation.HighlightSeverity): String {
    return when {
        severity >= com.intellij.lang.annotation.HighlightSeverity.ERROR -> "error"
        severity >= com.intellij.lang.annotation.HighlightSeverity.WARNING -> "warning"
        severity >= com.intellij.lang.annotation.HighlightSeverity.WEAK_WARNING -> "info"
        else -> "hint"
    }
}
