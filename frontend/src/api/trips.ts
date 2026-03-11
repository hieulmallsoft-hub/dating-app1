import { http } from "./http";

export type RoutePoint = {
  lat: number;
  lng: number;
};

export type TripItem = {
  id: string;
  userId: string;
  coupleId: string;
  startTime: string;
  endTime: string;
  distanceKm: number;
  startAddress: string | null;
  endAddress: string | null;
  routePreview: RoutePoint[] | null;
  createdAt: string;
  updatedAt: string;
};

export type TripDetail = TripItem & {
  routeFull: RoutePoint[] | null;
};

export type TripListResponse = {
  data: TripItem[];
  page: number;
  limit: number;
  total: number;
};

export type TripSyncItem = {
  id: string;
  startTime: number;
  endTime: number;
  distanceKm: number;
  startAddress?: string;
  endAddress?: string;
  routePoints: RoutePoint[];
};

export async function listTrips(params?: { userId?: string; page?: number; limit?: number }) {
  const { data } = await http.get<TripListResponse>("/trips", {
    params: {
      userId: params?.userId || undefined,
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
    },
  });
  return data;
}

export async function getTripDetail(id: string) {
  const { data } = await http.get<TripDetail>(`/trips/${id}`);
  return data;
}

export async function syncTrips(items: TripSyncItem[]) {
  const { data } = await http.post<{ success: boolean; count: number }>("/trips/sync", {
    trips: items,
  });
  return data;
}
