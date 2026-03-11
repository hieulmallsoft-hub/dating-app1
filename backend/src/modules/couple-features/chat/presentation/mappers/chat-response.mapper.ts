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
    isRead: boolean;
    createdAt: Date | string;
    sender?: SenderLike | null;
};

function toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
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
        isRead: Boolean(message.isRead),
        createdAt: toIsoString(message.createdAt),
        sender: toChatSenderResponse(message.sender)
    };
}

export function toChatMessageResponseList(messages: ChatMessageLike[]) {
    return messages.map(toChatMessageResponse);
}
