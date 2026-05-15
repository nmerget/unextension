fun handleShowQuickPick(payload: org.json.JSONObject?, reply: org.json.JSONObject, project: Project) {
    reply.put("type", "show-quick-pick:reply")
    val replyPayload = org.json.JSONObject()

    if (payload == null) {
        replyPayload.put("selected", org.json.JSONObject.NULL)
        reply.put("payload", replyPayload)
        return
    }

    val itemsArray = payload.optJSONArray("items") ?: org.json.JSONArray()
    val options = payload.optJSONObject("options")
    val canPickMany = options?.optBoolean("canPickMany", false) ?: false
    val title = options?.optString("title", "Select") ?: "Select"

    val items = (0 until itemsArray.length()).map { i ->
        itemsArray.getJSONObject(i)
    }

    val labels = items.map { it.optString("label", "") }.toTypedArray()

    // Dialogs must run on the EDT; use invokeAndWait to block until user responds
    com.intellij.openapi.application.ApplicationManager.getApplication().invokeAndWait {
        if (canPickMany) {
            // Multi-select: show a dialog listing items, user confirms selection
            val selectedIndices = mutableListOf<Int>()
            val dialogResult = com.intellij.openapi.ui.Messages.showDialog(
                project,
                labels.mapIndexed { i, label -> "${i + 1}. $label" }.joinToString("\n"),
                title,
                arrayOf("OK", "Cancel"),
                0,
                null
            )
            if (dialogResult == 0) {
                // OK pressed — select all items (simplified multi-select)
                for (i in items.indices) {
                    selectedIndices.add(i)
                }
            }
            if (selectedIndices.isEmpty()) {
                replyPayload.put("selected", org.json.JSONObject.NULL)
            } else {
                val selectedArray = org.json.JSONArray()
                for (index in selectedIndices) {
                    val item = items[index]
                    val selectedItem = org.json.JSONObject()
                    selectedItem.put("label", item.optString("label", ""))
                    selectedItem.put("description", item.optString("description", ""))
                    selectedItem.put("detail", item.optString("detail", ""))
                    selectedItem.put("value", item.optString("value", item.optString("label", "")))
                    selectedArray.put(selectedItem)
                }
                replyPayload.put("selected", selectedArray)
            }
        } else {
            val selected = com.intellij.openapi.ui.Messages.showChooseDialog(
                project,
                "Select an item",
                title,
                null,
                labels,
                labels.firstOrNull() ?: ""
            )
            if (selected < 0) {
                replyPayload.put("selected", org.json.JSONObject.NULL)
            } else {
                val item = items[selected]
                val selectedItem = org.json.JSONObject()
                selectedItem.put("label", item.optString("label", ""))
                selectedItem.put("description", item.optString("description", ""))
                selectedItem.put("detail", item.optString("detail", ""))
                selectedItem.put("value", item.optString("value", item.optString("label", "")))
                replyPayload.put("selected", selectedItem)
            }
        }
    }

    reply.put("payload", replyPayload)
}
