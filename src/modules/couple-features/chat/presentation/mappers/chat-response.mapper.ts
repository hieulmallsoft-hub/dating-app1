type SenderLike = {
    id: string;
    email: string;
    fullName?: string | null;
    avatar?: string | null;
};

type ChatMessageLike = {
    id: string;
    coupleId: string;
    senderId: string;
    type: "TEXT" | "IMAGE" | "VOICE" | "LOCATION";
    content?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    locationName?: string | null;
    locationAddress?: string | null;
    isRead: boolean;
    syncStatus?: string | null;
    confirmedByUserIds?: string[] | null;
    confirmedAt?: Date | string | null;
    payloadDeletedAt?: Date | string | null;
    createdAt: Date | string;
    sender?: SenderLike | null;
};

function toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toNullableIsoString(value?: Date | string | null) {
    return value ? toIsoString(value) : null;
}

function toChatSenderResponse(sender?: SenderLike | null) {
    if (!sender) {
        return undefined;
    }

    return {
        id: sender.id,
        email: sender.email,
        fullName: sender.fullName ?? null,
        avatar: sender.avatar ?? null
    };
}

export function toChatMessageResponse(message: ChatMessageLike) {
    return {
        id: message.id,
        coupleId: message.coupleId,
        senderId: message.senderId,
        type: message.type,
        content: message.content ?? null,
        lat: message.latitude ?? null,
        lng: message.longitude ?? null,
        locationName: message.locationName ?? null,
        locationAddress: message.locationAddress ?? null,
        isRead: Boolean(message.isRead),
        syncStatus: message.syncStatus ?? null,
        confirmedByUserIds: message.confirmedByUserIds ?? [],
        confirmedAt: toNullableIsoString(message.confirmedAt),
        payloadDeletedAt: toNullableIsoString(message.payloadDeletedAt),
        createdAt: toIsoString(message.createdAt),
        sender: toChatSenderResponse(message.sender)
    };
}

export function toChatMessageResponseList(messages: ChatMessageLike[]) {
    return messages.map(toChatMessageResponse);
}
