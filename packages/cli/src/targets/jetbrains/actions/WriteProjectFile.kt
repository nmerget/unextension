fun handleWriteProjectFile(payload: org.json.JSONObject?, reply: org.json.JSONObject) {
    if (payload == null) return
    val filePath = payload.optString("path", "")
    val content = payload.optString("content", "")
    val projectPath = com.intellij.openapi.project.ProjectManager.getInstance().openProjects.firstOrNull()?.basePath ?: ""
    val file = java.io.File(projectPath, filePath)
    val success = try {
        file.parentFile?.mkdirs()
        file.writeText(content, Charsets.UTF_8)
        true
    } catch (e: Exception) { false }
    reply.put("type", "write-project-file:reply")
    val replyPayload = org.json.JSONObject()
    replyPayload.put("success", success)
    reply.put("payload", replyPayload)
}
