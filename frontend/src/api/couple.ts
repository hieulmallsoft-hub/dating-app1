import { http } from "./http";

export type CoupleStatus = "ACTIVE" | "DISCONNECTED";

export type CoupleProfile = {
  id: string | null;
  status: CoupleStatus;
  birthDate: string | null;
  email: string | null;
  fullName: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type CoupleMutationResponse = {
  user2Id: string | null;
  status: CoupleStatus;
  startDate: string | null;
};

export type CoupleLocationUser = {
  id: string;
  fullName: string | null;
  email: string;
  avatar: string | null;
  latitude: number | null;
  longitude: number | null;
  lastActiveAt: string | null;
};

export type CoupleLocationsResponse = {
  me: CoupleLocationUser | null;
  partner: CoupleLocationUser | null;
};

export type CoupleLocationHistoryPoint = {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  createdAt: string;
};

export type CoupleLocationHistoryResponse = {
  me: CoupleLocationHistoryPoint[];
  partner: CoupleLocationHistoryPoint[];
};

export async function getMyCouple() {
  const { data } = await http.get<CoupleProfile>("/couple/profile");
  return data;
}

export async function joinCouple(inviteCode: string) {
  const { data } = await http.post<CoupleMutationResponse>("/couple/join", { inviteCode });
  return data;
}

export async function setStartDate(startDate: string) {
  const { data } = await http.put<CoupleMutationResponse>("/couple/start-date", { startDate });
  return data;
}

export async function disconnectCouple() {
  const { data } = await http.post<CoupleMutationResponse>("/couple/disconnect");
  return data;
}

export async function getCoupleLocations() {
  const { data } = await http.get<CoupleLocationsResponse>("/couple/locations");
  return data;
}

export async function getCoupleLocationHistory(limit = 120) {
  const { data } = await http.get<CoupleLocationHistoryResponse>("/couple/location-history", {
    params: { limit },
  });
  return data;
}
