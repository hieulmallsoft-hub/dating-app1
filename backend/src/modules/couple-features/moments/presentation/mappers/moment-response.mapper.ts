type MomentLike = {
    id: string;
    coupleId: string;
    creatorId: string;
    content?: string | null;
    photos?: string[] | null;
    privacy: "COUPLE" | "PRIVATE";
    createdAt: Date | string;
    updatedAt: Date | string;
    creator?: {
        id: string;
        email: string;
        fullName?: string | null;
        avatar?: string | null;
    } | null;
};

function toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toMomentResponse(moment: MomentLike, currentUserId?: string) {
    const isOwner = currentUserId ? moment.creatorId === currentUserId : undefined;
    const creatorName = moment.creator?.fullName?.trim() || moment.creator?.email || moment.creatorId;
    const isPrivate = moment.privacy === "PRIVATE";

    return {
        id: moment.id,
        coupleId: moment.coupleId,
        creatorId: moment.creatorId,
        creatorName,
        creatorRole: isOwner === undefined ? undefined : isOwner ? "ME" : "PARTNER",
        isUpdate: isOwner,
        content: moment.content ?? null,
        photos: Array.isArray(moment.photos) ? moment.photos : null,
        isPrivate,
        privacy: isPrivate,
        createdAt: toIsoString(moment.createdAt),
        updatedAt: toIsoString(moment.updatedAt),
        creator: moment.creator
            ? {
                  id: moment.creator.id,
                  email: moment.creator.email,
                  fullName: moment.creator.fullName ?? null,
                  avatar: moment.creator.avatar ?? null
              }
            : undefined
    };
}

export function toMomentResponseList(moments: MomentLike[], currentUserId?: string) {
    return moments.map((moment) => toMomentResponse(moment, currentUserId));
}
