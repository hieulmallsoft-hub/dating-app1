type MediaLike = {
    id: string;
    coupleId: string;
    uploaderId: string;
    url: string;
    thumbUrl?: string | null;
    caption?: string | null;
    type: "image" | "video";
    downloadUrl?: string | null;
    visibility: "couple_only" | "friends" | "public";
    status: "processing" | "active" | "flagged" | "synced";
    createdAt: Date | string;
    updatedAt: Date | string;
};

function toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toMediaItemResponse(media: MediaLike) {
    return {
        id: media.id,
        coupleId: media.coupleId,
        uploaderId: media.uploaderId,
        url: media.url,
        thumbUrl: media.thumbUrl ?? null,
        caption: media.caption ?? null,
        type: media.type,
        downloadUrl: media.downloadUrl ?? null,
        visibility: media.visibility,
        status: media.status,
        createdAt: toIsoString(media.createdAt),
        updatedAt: toIsoString(media.updatedAt)
    };
}

export function toMediaItemResponseList(items: MediaLike[]) {
    return items.map(toMediaItemResponse);
}
