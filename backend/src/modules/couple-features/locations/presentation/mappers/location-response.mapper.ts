type LocationUserLike = {
    id: string;
    email: string;
    fullName?: string | null;
    avatar?: string | null;
};

type LocationLike = {
    id: string;
    name: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    locationType: string;
    radius: number;
    iconResName?: string | null;
    isSynced: boolean;
    isDeleted: boolean;
    coupleId: string;
    sharedBy: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    sharedByUser?: LocationUserLike | null;
};

function toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toNullableNumber(value: unknown): number | null {
    const parsed = typeof value === "string" ? Number(value) : value;
    return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
}

export function toLocationResponse(location: LocationLike, includeSharedByUser = false) {
    return {
        id: location.id,
        name: location.name,
        address: location.address ?? null,
        latitude: toNullableNumber(location.latitude),
        longitude: toNullableNumber(location.longitude),
        locationType: location.locationType,
        radius: location.radius,
        iconResName: location.iconResName ?? null,
        isSynced: Boolean(location.isSynced),
        isDeleted: Boolean(location.isDeleted),
        coupleId: location.coupleId,
        sharedBy: location.sharedBy,
        createdAt: toIsoString(location.createdAt),
        updatedAt: toIsoString(location.updatedAt),
        sharedByUser:
            includeSharedByUser && location.sharedByUser
                ? {
                      id: location.sharedByUser.id,
                      email: location.sharedByUser.email,
                      fullName: location.sharedByUser.fullName ?? null,
                      avatar: location.sharedByUser.avatar ?? null
                  }
                : undefined
    };
}

export function toLocationResponseList(locations: LocationLike[], includeSharedByUser = false) {
    return locations.map((location) => toLocationResponse(location, includeSharedByUser));
}
