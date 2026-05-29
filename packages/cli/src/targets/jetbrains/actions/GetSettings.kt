fun handleGetSettings(payload: org.json.JSONObject?, reply: org.json.JSONObject, project: Project) {
    reply.put("type", "get-settings:reply")
    val replyPayload = org.json.JSONObject()

    val appState = AppSettingsState.getInstance().state
    val projectState = ProjectSettingsState.getInstance(project).state

    // Generated: read each setting from the appropriate state based on scope
    // Global-scoped settings are read from appState:
    //   replyPayload.put("editor.fontSize", appState.editorFontSize)
    // Workspace-scoped settings are read from projectState:
    //   replyPayload.put("workspace.autoSave", projectState.workspaceAutoSave)

    reply.put("payload", replyPayload)
}
