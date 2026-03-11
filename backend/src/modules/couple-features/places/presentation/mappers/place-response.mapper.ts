type PlaceUserLike = {
    id: string;
    email: string;
    fullName?: string | null;
    avatar?: string | null;
};

type PlaceLike = {
    id: string;
    name: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    placeType: string;
    radius: number;
    iconResName?: string | null;
    isSynced: boolean;
    isDeleted: boolean;
    coupleId: string;
    sharedBy: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    sharedByUser?: PlaceUserLike | null;
};

function toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toNullableNumber(value: unknown): number | null {
    const parsed = typeof value === "string" ? Number(value) : value;
    return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
}

export function toPlaceResponse(place: PlaceLike, includeSharedByUser = false) {
    return {
        id: place.id,
        name: place.name,
        address: place.address ?? null,
        latitude: toNullableNumber(place.latitude),
        longitude: toNullableNumber(place.longitude),
        placeType: place.placeType,
        radius: place.radius,
        iconResName: place.iconResName ?? null,
        isSynced: Boolean(place.isSynced),
        isDeleted: Boolean(place.isDeleted),
        coupleId: place.coupleId,
        sharedBy: place.sharedBy,
        createdAt: toIsoString(place.createdAt),
        updatedAt: toIsoString(place.updatedAt),
        sharedByUser:
            includeSharedByUser && place.sharedByUser
                ? {
                      id: place.sharedByUser.id,
                      email: place.sharedByUser.email,
                      fullName: place.sharedByUser.fullName ?? null,
                      avatar: place.sharedByUser.avatar ?? null
                  }
                : undefined
    };
}

export function toPlaceResponseList(places: PlaceLike[], includeSharedByUser = false) {
    return places.map((place) => toPlaceResponse(place, includeSharedByUser));
}
