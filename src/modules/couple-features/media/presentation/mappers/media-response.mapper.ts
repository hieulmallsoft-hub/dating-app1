type MediaLike = {
    id: string;
    coupleId: string;
    uploaderId: string;
    url?: string | null;
    thumbUrl?: string | null;
    caption?: string | null;
    type: "image" | "video";
    downloadUrl?: string | null;
    visibility: "couple_only" | "friends" | "public";
    status: "processing" | "active" | "flagged" | "synced";
    syncStatus?: string | null;
    confirmedByUserIds?: string[] | null;
    confirmedAt?: Date | string | null;
    payloadDeletedAt?: Date | string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
};

function toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toNullableIsoString(value?: Date | string | null) {
    return value ? toIsoString(value) : null;
}

export function toMediaItemResponse(media: MediaLike) {
    return {
        id: media.id,
        coupleId: media.coupleId,
        uploaderId: media.uploaderId,
        url: media.url ?? null,
        thumbUrl: media.thumbUrl ?? null,
        caption: media.caption ?? null,
        type: media.type,
        downloadUrl: media.downloadUrl ?? null,
        visibility: media.visibility,
        status: media.status,
        syncStatus: media.syncStatus ?? null,
        confirmedByUserIds: media.confirmedByUserIds ?? [],
        confirmedAt: toNullableIsoString(media.confirmedAt),
        payloadDeletedAt: toNullableIsoString(media.payloadDeletedAt),
        createdAt: toIsoString(media.createdAt),
        updatedAt: toIsoString(media.updatedAt)
    };
}

export function toMediaItemResponseList(items: MediaLike[]) {
    return items.map(toMediaItemResponse);
}
