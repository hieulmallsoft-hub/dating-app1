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

export type CreateTestNotificationPayload = {
  title: string;
  content: string;
  type?: string;
  targetUserId?: string;
};

export async function getNotifications() {
  const { data } = await http.get<AppNotification[]>("/notifications");
  return data;
}

export async function markNotificationAsRead(id: string) {
  const { data } = await http.put<AppNotification>(`/notifications/${id}/read`);
  return data;
}

export async function createTestNotification(payload: CreateTestNotificationPayload) {
  const { data } = await http.post<AppNotification>("/notifications/test", payload);
  return data;
}
