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

export async function updateRealtimeLocation(payload: UpdateRealtimeLocationPayload) {
  const { data } = await http.post<UpdateRealtimeLocationResponse>("/location/update", payload);
  return data;
}

export async function getPartnerRealtimeLocation() {
  const { data } = await http.get<PartnerRealtimeLocationResponse>("/location/partner");
  return data;
}

