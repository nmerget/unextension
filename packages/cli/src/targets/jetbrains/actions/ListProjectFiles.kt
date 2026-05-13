fun handleListProjectFiles(payload: org.json.JSONObject?, reply: org.json.JSONObject) {
    val projectPath = com.intellij.openapi.project.ProjectManager.getInstance().openProjects.firstOrNull()?.basePath ?: ""
    val pattern = payload?.optString("pattern", "**/*") ?: "**/*"
    val extFilter = Regex("""\*\*\/\*\.([a-zA-Z0-9]+)$""").find(pattern)?.groupValues?.get(1)
    val files = if (projectPath.isNotEmpty()) {
        val root = java.io.File(projectPath)
        root.walkTopDown()
            .onEnter { dir ->
                val name = dir.name
                name != "node_modules" && name != ".git" && name != ".idea" &&
                name != ".gradle" && name != "build" && name != "out"
            }
            .filter { it.isFile && (extFilter == null || it.extension == extFilter) }
            .map { it.relativeTo(root).path.replace("\\", "/") }
            .toList()
    } else emptyList()
    reply.put("type", "list-project-files:reply")
    reply.put("payload", org.json.JSONArray(files))
}
