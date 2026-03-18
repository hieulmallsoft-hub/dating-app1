import { http } from "./http";

export type PresenceStatus = "online" | "background" | "offline";

export type UpdateRealtimeLocationPayload = {
  lat: number;
  lng: number;
  accuracy?: number;
  batteryLevel?: number;
  isCharging?: boolean;
  speed?: number;
  timestamp?: number;
};

export type UpdateRealtimeLocationResponse = {
  lat: number;
  lng: number;
  bat: number | null;
  chg: boolean | null;
  spd: number | null;
  acc: number | null;
  ts: number;
};

export type PartnerRealtimeLocationResponse = {
  partner: {
    userId: string;
    lat: number | null;
    lng: number | null;
    batteryLevel: number | null;
    isCharging: boolean | null;
    speed: number | null;
    lastUpdated: number | null;
  };
  status: PresenceStatus;
  statusTimestamp: number | null;
};

type UpdateUserLocationApiResponse = {
  userId: string;
  accountCode: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  batteryLevel: number | null;
  isCharging: boolean | null;
  speed: number | null;
};

type CoupleLocationsApiResponse = {
  partner: {
    id: string;
    latitude: number | null;
    longitude: number | null;
    batteryLevel?: number | null;
    isCharging?: boolean | null;
    speed?: number | null;
    lastActiveAt: string | null;
  } | null;
};

export async function updateRealtimeLocation(payload: UpdateRealtimeLocationPayload) {
  const { data } = await http.put<UpdateUserLocationApiResponse>("/profile/location", payload);
  return {
    lat: data.latitude,
    lng: data.longitude,
    bat: data.batteryLevel ?? null,
    chg: data.isCharging ?? null,
    spd: data.speed ?? null,
    acc: data.accuracy ?? null,
    ts: payload.timestamp ?? Date.now(),
  };
}

export async function getPartnerRealtimeLocation() {
  const { data } = await http.get<CoupleLocationsApiResponse>("/couple/locations");
  const partner = data.partner;
  const rawLastUpdated = partner?.lastActiveAt ? new Date(partner.lastActiveAt).getTime() : null;
  const lastUpdated = typeof rawLastUpdated === "number" && Number.isFinite(rawLastUpdated) ? rawLastUpdated : null;
  const now = Date.now();
  const ageMs = lastUpdated === null ? Number.POSITIVE_INFINITY : now - lastUpdated;
  const status: PresenceStatus =
    ageMs <= 90_000 ? "online" : ageMs <= 30 * 60 * 1000 ? "background" : "offline";

  return {
    partner: {
      userId: partner?.id ?? "",
      lat: partner?.latitude ?? null,
      lng: partner?.longitude ?? null,
      batteryLevel: partner?.batteryLevel ?? null,
      isCharging: partner?.isCharging ?? null,
      speed: partner?.speed ?? null,
      lastUpdated,
    },
    status,
    statusTimestamp: lastUpdated,
  } satisfies PartnerRealtimeLocationResponse;
}
