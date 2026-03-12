import { http } from "./http";

export type AppNotification = {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: string | null;
  isRead: boolean;
  createdAt: string;
};

export type PushTokenPayload = {
  token: string;
  platform?: "web" | "android" | "ios" | "unknown";
};

export async function getNotifications() {
  const { data } = await http.get<AppNotification[]>("/notifications");
  return data;
}

export async function markNotificationAsRead(id: string) {
  const { data } = await http.put<AppNotification>(`/notifications/${id}/read`);
  return data;
}

export async function registerPushToken(payload: PushTokenPayload) {
  const { data } = await http.post<{ success: boolean; deviceId?: string | null; idDevice?: string | null }>(
    "/notifications/push-tokens/register",
    payload
  );
  return data;
}

export async function unregisterPushToken(payload: PushTokenPayload) {
  const { data } = await http.post<{ success: boolean }>("/notifications/push-tokens/unregister", payload);
  return data;
}
