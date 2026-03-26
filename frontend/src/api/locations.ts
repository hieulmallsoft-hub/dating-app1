import { http } from "./http";

export type LocationType =
  | "HOME"
  | "SCHOOL"
  | "COMPANY"
  | "RESTAURANT"
  | "CAFE"
  | "PARK"
  | "MUSEUM"
  | "OTHER";

export type LocationItem = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  locationType: LocationType;
  radius: number;
  iconResName: string | null;
  isSynced: boolean;
  isDeleted: boolean;
  coupleId: string;
  sharedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type LocationPayload = Partial<{
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  locationType: LocationType;
  radius: number;
  iconResName: string;
  isSynced: boolean;
  isDeleted: boolean;
}>;

export type SearchLocationItem = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  locationType: LocationType;
  type: LocationType;
};

export async function getLocations(since?: number) {
  const { data } = await http.get<LocationItem[]>("/locations", {
    params: { since: since ?? undefined },
  });
  return data;
}

export async function createLocation(payload: LocationPayload) {
  const { data } = await http.post<LocationItem>("/locations", payload);
  return data;
}

export async function updateLocation(id: string, payload: LocationPayload) {
  const { data } = await http.patch<LocationItem>(`/locations/${id}`, payload);
  return data;
}

export async function deleteLocation(id: string) {
  const { data } = await http.delete<LocationItem>(`/locations/${id}`);
  return data;
}

export async function searchLocations(query: string) {
  const { data } = await http.get<SearchLocationItem[]>("/locations/search", {
    params: { q: query },
  });
  return data;
}

export async function sendGeofenceEvent(payload: {
  locationId: string;
  transition: "ENTER" | "EXIT";
  timestamp?: number;
}) {
  const { data } = await http.post<{
    success: boolean;
    locationId: string;
    transition: "ENTER" | "EXIT";
    timestamp: number;
  }>("/geofence/event", payload);
  return data;
}
