type SettingsLike = {
    id: string;
    userId: string;
    notificationEnabled: boolean;
    theme: string;
    privacy: string;
    updatedAt: Date | string;
};

function toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toSettingsResponse(settings: SettingsLike) {
    return {
        id: settings.id,
        userId: settings.userId,
        notificationEnabled: Boolean(settings.notificationEnabled),
        theme: settings.theme,
        privacy: settings.privacy,
        updatedAt: toIsoString(settings.updatedAt)
    };
}
