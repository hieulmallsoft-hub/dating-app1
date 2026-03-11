type NotificationLike = {
    id: string;
    userId: string;
    title: string;
    content: string;
    type?: string | null;
    isRead: boolean;
    createdAt: Date | string;
};

function toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toNotificationResponse(notification: NotificationLike) {
    return {
        id: notification.id,
        userId: notification.userId,
        title: notification.title,
        content: notification.content,
        type: notification.type ?? null,
        isRead: Boolean(notification.isRead),
        createdAt: toIsoString(notification.createdAt)
    };
}

export function toNotificationResponseList(notifications: NotificationLike[]) {
    return notifications.map(toNotificationResponse);
}
