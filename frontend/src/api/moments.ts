import { http } from "./http";

export type MomentPrivacy = "COUPLE" | "PRIVATE";

export type MomentCreator = {
  id: string;
  email: string;
  fullName: string | null;
  avatar: string | null;
};

export type MomentItem = {
  id: string;
  coupleId: string;
  creatorId: string;
  content: string | null;
  photos: string[] | null;
  privacy: MomentPrivacy;
  createdAt: string;
  updatedAt: string;
  creator?: MomentCreator;
};

export type MomentPayload = {
  content?: string;
  photos?: string[];
  privacy?: MomentPrivacy;
};

export async function getMoments() {
  const { data } = await http.get<MomentItem[]>("/moments");
  return data;
}

export async function createMoment(payload: MomentPayload) {
  const { data } = await http.post<MomentItem>("/moments", payload);
  return data;
}

export async function updateMoment(id: string, payload: MomentPayload) {
  const { data } = await http.put<MomentItem>(`/moments/${id}`, payload);
  return data;
}

export async function deleteMoment(id: string) {
  const { data } = await http.delete<{ success: boolean }>(`/moments/${id}`);
  return data;
}
