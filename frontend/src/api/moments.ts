import { http } from "./http";

export type MomentVisibility = boolean;

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
  creatorName?: string;
  creatorRole?: "ME" | "PARTNER";
  isUpdate?: boolean;
  content: string | null;
  photos: string[] | null;
  isPrivate: MomentVisibility;
  privacy?: MomentVisibility;
  createdAt: string;
  updatedAt: string;
  creator?: MomentCreator;
};

export type MomentPayload = {
  content?: string;
  photos?: string[];
  isPrivate?: MomentVisibility;
  privacy?: MomentVisibility;
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
  const { data } = await http.patch<MomentItem>(`/moments/${id}`, payload);
  return data;
}

export async function deleteMoment(id: string) {
  const { data } = await http.delete<{ success: boolean }>(`/moments/${id}`);
  return data;
}
