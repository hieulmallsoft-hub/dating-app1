type EventLike = {
    id: string;
    title: string;
    description?: string | null;
    date: Date | string;
    isAnniversary: boolean;
    coupleId: string;
    creatorId: string;
    createdAt: Date | string;
    updatedAt: Date | string;
};

function toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toEventResponse(event: EventLike) {
    return {
        id: event.id,
        title: event.title,
        description: event.description ?? null,
        date: toIsoString(event.date),
        isAnniversary: Boolean(event.isAnniversary),
        coupleId: event.coupleId,
        creatorId: event.creatorId,
        createdAt: toIsoString(event.createdAt),
        updatedAt: toIsoString(event.updatedAt)
    };
}

export function toEventResponseList(events: EventLike[]) {
    return events.map(toEventResponse);
}
