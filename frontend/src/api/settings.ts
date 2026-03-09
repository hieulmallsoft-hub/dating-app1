import { http } from "./http";

export type AppSettings = {
  id: string;
  userId: string;
  notificationEnabled: boolean;
  theme: "light" | "dark" | "system";
  privacy: "public" | "friends" | "private";
  updatedAt: string;
};

export type UpdateSettingsPayload = Partial<{
  notificationEnabled: boolean;
  theme: "light" | "dark" | "system";
  privacy: "public" | "friends" | "private";
}>;

export async function getSettings() {
  const { data } = await http.get<AppSettings>("/settings");
  return data;
}

export async function updateSettings(payload: UpdateSettingsPayload) {
  const { data } = await http.put<AppSettings>("/settings", payload);
  return data;
}
