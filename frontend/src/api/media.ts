import { http } from "./http";

export type AlbumFilter = "all" | "me" | "partner";
export type MediaType = "image" | "video";
export type MediaVisibility = "couple_only" | "friends" | "public";
export type MediaStatus = "processing" | "active" | "flagged" | "synced";

export type MediaItem = {
  id: string;
  coupleId: string;
  uploaderId: string;
  url: string;
  thumbUrl?: string | null;
  caption?: string | null;
  type: MediaType;
  visibility?: MediaVisibility;
  status: MediaStatus;
  createdAt: string;
  updatedAt: string;
};

export type MediaPage = {
  items: MediaItem[];
  nextCursor: string | null;
};

export type MediaChangeType = "created" | "updated" | "deleted";

export type MediaChange = {
  changed: boolean;
  version: number;
  coupleId?: string;
  type?: MediaChangeType;
  mediaId?: string;
  actorId?: string;
  at?: string;
};

export type CreateMediaPayload = {
  url: string;
  type?: MediaType;
  caption?: string;
  visibility?: MediaVisibility;
  thumbUrl?: string;
};

export type UpdateMediaPayload = {
  caption?: string;
  visibility?: MediaVisibility;
  thumbUrl?: string;
};

export async function getAlbum(params?: {
  filter?: AlbumFilter;
  limit?: number;
  cursor?: string | null;
}) {
  const { data } = await http.get<MediaPage>("/media", {
    params: {
      filter: params?.filter ?? "all",
      limit: params?.limit ?? 20,
      cursor: params?.cursor ?? undefined,
    },
  });
  return data;
}

export async function createMedia(payload: CreateMediaPayload) {
  const { data } = await http.post<MediaItem>("/media", payload);
  return data;
}

export async function updateMedia(id: string, payload: UpdateMediaPayload) {
  const { data } = await http.patch<MediaItem>(`/media/${id}`, payload);
  return data;
}

export async function deleteMedia(id: string) {
  const { data } = await http.delete<{ success: boolean }>(`/media/${id}`);
  return data;
}

export async function updateMediaStatus(id: string, status: MediaStatus) {
  const { data } = await http.patch<MediaItem>(`/media/${id}/status`, { status });
  return data;
}

export async function getMediaById(id: string) {
  const { data } = await http.get<MediaItem>(`/media/${id}`);
  return data;
}

export async function getMediaDownloadUrl(id: string) {
  const { data } = await http.get<{ downloadUrl?: string | null }>(`/media/${id}/download`);
  return data;
}

export async function waitAlbumChange(params?: {
  since?: number;
  timeoutMs?: number;
}) {
  const { data } = await http.get<MediaChange>("/media/changes", {
    params: {
      since: params?.since ?? 0,
      timeoutMs: params?.timeoutMs ?? 25000,
    },
  });
  return data;
}
