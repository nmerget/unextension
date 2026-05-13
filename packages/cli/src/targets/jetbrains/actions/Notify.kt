fun handleNotify(payload: org.json.JSONObject?, reply: org.json.JSONObject, project: Project) {
    if (payload == null) return
    val message = payload.optString("message", "")
    val level = payload.optString("level", "info")
    val notificationType = when (level) {
        "error" -> com.intellij.notification.NotificationType.ERROR
        "warning" -> com.intellij.notification.NotificationType.WARNING
        else -> com.intellij.notification.NotificationType.INFORMATION
    }
    com.intellij.notification.NotificationGroupManager.getInstance()
        .getNotificationGroup("unextension")
        ?.createNotification(message, notificationType)
        ?.notify(project)
    reply.put("type", "notify:reply")
    val replyPayload = org.json.JSONObject()
    replyPayload.put("shown", true)
    reply.put("payload", replyPayload)
}
