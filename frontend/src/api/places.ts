import { http } from "./http";

export type PlaceType =
  | "HOME"
  | "SCHOOL"
  | "COMPANY"
  | "RESTAURANT"
  | "CAFE"
  | "PARK"
  | "MUSEUM"
  | "OTHER";

export type PlaceItem = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  placeType: PlaceType;
  radius: number;
  iconResName: string | null;
  isSynced: boolean;
  isDeleted: boolean;
  coupleId: string;
  sharedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PlacePayload = Partial<{
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  placeType: PlaceType;
  radius: number;
  iconResName: string;
  isSynced: boolean;
  isDeleted: boolean;
}>;

export type SearchPlaceItem = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  placeType: PlaceType;
  type: PlaceType;
};

export async function getPlaces(since?: number) {
  const { data } = await http.get<PlaceItem[]>("/places", {
    params: { since: since ?? undefined },
  });
  return data;
}

export async function createPlace(payload: PlacePayload) {
  const { data } = await http.post<PlaceItem>("/places", payload);
  return data;
}

export async function updatePlace(id: string, payload: PlacePayload) {
  const { data } = await http.patch<PlaceItem>(`/places/${id}`, payload);
  return data;
}

export async function deletePlace(id: string) {
  const { data } = await http.delete<PlaceItem>(`/places/${id}`);
  return data;
}

export async function searchPlaces(query: string) {
  const { data } = await http.get<SearchPlaceItem[]>("/places/search", {
    params: { q: query },
  });
  return data;
}

export async function sendGeofenceEvent(payload: {
  placeId: string;
  transition: "ENTER" | "EXIT";
  timestamp?: number;
}) {
  const { data } = await http.post<{
    success: boolean;
    placeId: string;
    transition: "ENTER" | "EXIT";
    timestamp: number;
  }>("/geofence/event", payload);
  return data;
}
