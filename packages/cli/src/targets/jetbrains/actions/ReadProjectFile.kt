fun handleReadProjectFile(payload: org.json.JSONObject?, reply: org.json.JSONObject) {
    if (payload == null) return
    val filePath = payload.optString("path", "")
    val projectPath = com.intellij.openapi.project.ProjectManager.getInstance().openProjects.firstOrNull()?.basePath ?: ""
    val file = java.io.File(projectPath, filePath)
    val content = if (file.exists() && file.isFile) file.readText(Charsets.UTF_8) else ""
    reply.put("type", "read-project-file:reply")
    val replyPayload = org.json.JSONObject()
    replyPayload.put("content", content)
    replyPayload.put("encoding", "utf8")
    reply.put("payload", replyPayload)
}
