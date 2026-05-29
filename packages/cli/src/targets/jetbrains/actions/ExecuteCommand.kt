fun handleExecuteCommand(payload: org.json.JSONObject?, reply: org.json.JSONObject, project: Project) {
    reply.put("type", "execute-command:reply")
    val replyPayload = org.json.JSONObject()

    if (payload == null || payload.optString("command", "").isEmpty()) {
        replyPayload.put("error", "Command field is required")
        reply.put("payload", replyPayload)
        return
    }

    val command = payload.getString("command")
    val args = payload.optJSONArray("args")

    // Allowlist check — commandsAllow is injected at build time as a class-level property
    if (commandsAllow != null) {
        if (!isCommandAllowed(command, commandsAllow!!)) {
            replyPayload.put("error", "Command not allowed: $command")
            reply.put("payload", replyPayload)
            return
        }
    }

    // Only unextension.* commands are supported in JetBrains
    if (!command.startsWith("unextension.")) {
        replyPayload.put("error",
            "Command not supported in JetBrains: $command. Use getTarget() to detect the platform and call native commands conditionally.")
        reply.put("payload", replyPayload)
        return
    }

    // Unextension command dispatch
    val result = when (command) {
        "unextension.openSettings" -> {
            com.intellij.openapi.application.ApplicationManager.getApplication().invokeLater {
                com.intellij.openapi.options.ShowSettingsUtil.getInstance().showSettingsDialog(
                    project, null as com.intellij.openapi.options.Configurable?
                )
            }
            org.json.JSONObject.NULL
        }
        "unextension.openInBrowser" -> {
            val url = args?.optString(0, "") ?: ""
            if (url.isNotEmpty()) {
                com.intellij.openapi.application.ApplicationManager.getApplication().invokeLater {
                    try {
                        com.intellij.openapi.fileEditor.impl.HTMLEditorProvider.openEditor(
                            project, "Browser", url, null
                        )
                    } catch (e: Exception) {
                        // Built-in browser not available, fall back to system browser
                        com.intellij.ide.BrowserUtil.browse(url)
                    }
                }
                org.json.JSONObject.NULL
            } else {
                replyPayload.put("error", "unextension.openInBrowser requires a URL argument")
                reply.put("payload", replyPayload)
                return
            }
        }
        "unextension.togglePanel" -> {
            executeIntelliJAction("ActivateTerminalToolWindow", project)
            org.json.JSONObject.NULL
        }
        "unextension.toggleSidebar" -> {
            executeIntelliJAction("ActivateProjectToolWindow", project)
            org.json.JSONObject.NULL
        }
        "unextension.newScratchFile" -> {
            executeIntelliJAction("NewScratchFile", project)
            org.json.JSONObject.NULL
        }
        // Editor actions
        "unextension.formatDocument" -> {
            executeIntelliJAction("ReformatCode", project)
            org.json.JSONObject.NULL
        }
        "unextension.commentLine" -> {
            executeIntelliJAction("CommentByLineComment", project)
            org.json.JSONObject.NULL
        }
        "unextension.undo" -> {
            executeIntelliJAction("\$Undo", project)
            org.json.JSONObject.NULL
        }
        "unextension.redo" -> {
            executeIntelliJAction("\$Redo", project)
            org.json.JSONObject.NULL
        }
        "unextension.selectAll" -> {
            executeIntelliJAction("\$SelectAll", project)
            org.json.JSONObject.NULL
        }
        // Navigation
        "unextension.goToDefinition" -> {
            executeIntelliJAction("GotoDeclaration", project)
            org.json.JSONObject.NULL
        }
        "unextension.goToFile" -> {
            executeIntelliJAction("GotoFile", project)
            org.json.JSONObject.NULL
        }
        "unextension.goToSymbol" -> {
            executeIntelliJAction("GotoSymbol", project)
            org.json.JSONObject.NULL
        }
        "unextension.findInFiles" -> {
            executeIntelliJAction("FindInPath", project)
            org.json.JSONObject.NULL
        }
        "unextension.replaceInFiles" -> {
            executeIntelliJAction("ReplaceInPath", project)
            org.json.JSONObject.NULL
        }
        // Refactoring
        "unextension.rename" -> {
            executeIntelliJAction("RenameElement", project)
            org.json.JSONObject.NULL
        }
        "unextension.quickFix" -> {
            executeIntelliJAction("ShowIntentionActions", project)
            org.json.JSONObject.NULL
        }
        // View/UI
        "unextension.toggleFullscreen" -> {
            executeIntelliJAction("ToggleFullScreen", project)
            org.json.JSONObject.NULL
        }
        "unextension.zoomIn" -> {
            executeIntelliJAction("EditorIncreaseFontSize", project)
            org.json.JSONObject.NULL
        }
        "unextension.zoomOut" -> {
            executeIntelliJAction("EditorDecreaseFontSize", project)
            org.json.JSONObject.NULL
        }
        "unextension.closeActiveEditor" -> {
            executeIntelliJAction("CloseContent", project)
            org.json.JSONObject.NULL
        }
        "unextension.closeAllEditors" -> {
            executeIntelliJAction("CloseAllEditors", project)
            org.json.JSONObject.NULL
        }
        // VCS/Git
        "unextension.gitCommit" -> {
            executeIntelliJAction("CheckinProject", project)
            org.json.JSONObject.NULL
        }
        "unextension.gitPull" -> {
            executeIntelliJAction("Vcs.UpdateProject", project)
            org.json.JSONObject.NULL
        }
        "unextension.gitPush" -> {
            executeIntelliJAction("Vcs.Push", project)
            org.json.JSONObject.NULL
        }
        // Terminal
        "unextension.newTerminal" -> {
            executeIntelliJAction("Terminal.OpenInTerminal", project)
            org.json.JSONObject.NULL
        }
        else -> {
            replyPayload.put("error",
                "Command not supported in JetBrains: $command. Use getTarget() to detect the platform and call native commands conditionally.")
            reply.put("payload", replyPayload)
            return
        }
    }

    replyPayload.put("result", result)
    reply.put("payload", replyPayload)
}

private fun executeIntelliJAction(actionId: String, project: Project) {
    val action = com.intellij.openapi.actionSystem.ActionManager.getInstance().getAction(actionId)
    if (action != null) {
        com.intellij.openapi.application.ApplicationManager.getApplication().invokeLater {
            val event = com.intellij.openapi.actionSystem.AnActionEvent.createFromAnAction(
                action,
                null,
                com.intellij.openapi.actionSystem.ActionPlaces.UNKNOWN,
                com.intellij.openapi.actionSystem.impl.SimpleDataContext.getProjectContext(project)
            )
            action.actionPerformed(event)
        }
    }
}

private fun isCommandAllowed(command: String, allowlist: List<String>): Boolean {
    return allowlist.any { pattern -> matchCommandPattern(command, pattern) }
}

private fun matchCommandPattern(command: String, pattern: String): Boolean {
    if (!pattern.contains('*')) return command == pattern
    val regexStr = "^" + Regex.escape(pattern).replace("\\*", "[^.]+") + "$"
    return Regex(regexStr).matches(command)
}
