import { http } from "./http";

export type UploadResponse = {
  fileUrl: string;
  type: "image" | "video";
  mimeType: string;
  size: number;
  originalName: string;
  fileName: string;
};

export type PresignRequest = {
  fileName: string;
  type: "image" | "video" | "voice";
};

export async function uploadFile(file: File) {
  const form = new FormData();
  form.append("file", file);

  // Let the browser/axios set the multipart boundary automatically.
  const { data } = await http.post<UploadResponse>("/uploads/file", form);
  return data;
}

export async function createPresign(payload: PresignRequest) {
  const { data } = await http.post("/uploads/presign", payload);
  return data;
}
