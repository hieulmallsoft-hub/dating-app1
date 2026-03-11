type RoutePointLike = {
    lat: number;
    lng: number;
};

type TripLike = {
    id: string;
    userId: string;
    coupleId: string;
    startTime: Date | string;
    endTime: Date | string;
    distanceKm: number;
    startAddress?: string | null;
    endAddress?: string | null;
    routePreview?: RoutePointLike[] | null;
    routeFull?: RoutePointLike[] | null;
    createdAt: Date | string;
    updatedAt: Date | string;
};

function toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toRoutePoints(points?: RoutePointLike[] | null) {
    if (!Array.isArray(points)) {
        return null;
    }

    return points
        .filter((point) => point && Number.isFinite(point.lat) && Number.isFinite(point.lng))
        .map((point) => ({
            lat: Number(point.lat),
            lng: Number(point.lng)
        }));
}

export function toTripResponse(trip: TripLike, includeRouteFull = false) {
    return {
        id: trip.id,
        userId: trip.userId,
        coupleId: trip.coupleId,
        startTime: toIsoString(trip.startTime),
        endTime: toIsoString(trip.endTime),
        distanceKm: Number(trip.distanceKm),
        startAddress: trip.startAddress ?? null,
        endAddress: trip.endAddress ?? null,
        routePreview: toRoutePoints(trip.routePreview),
        routeFull: includeRouteFull ? toRoutePoints(trip.routeFull) : undefined,
        createdAt: toIsoString(trip.createdAt),
        updatedAt: toIsoString(trip.updatedAt)
    };
}

export function toTripResponseList(trips: TripLike[]) {
    return trips.map((trip) => toTripResponse(trip));
}
