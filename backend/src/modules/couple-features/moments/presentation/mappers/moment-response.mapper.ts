type MomentLike = {
    id: string;
    coupleId: string;
    creatorId: string;
    content?: string | null;
    photos?: string[] | null;
    privacy: "COUPLE" | "PRIVATE";
    createdAt: Date | string;
    updatedAt: Date | string;
};

function toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toMomentResponse(moment: MomentLike) {
    return {
        id: moment.id,
        coupleId: moment.coupleId,
        creatorId: moment.creatorId,
        content: moment.content ?? null,
        photos: Array.isArray(moment.photos) ? moment.photos : null,
        privacy: moment.privacy,
        createdAt: toIsoString(moment.createdAt),
        updatedAt: toIsoString(moment.updatedAt)
    };
}

export function toMomentResponseList(moments: MomentLike[]) {
    return moments.map(toMomentResponse);
}
