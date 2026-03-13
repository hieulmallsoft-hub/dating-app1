import { http } from "./http";

export async function logout() {
  const { data } = await http.post<{ success: boolean }>("/auth/logout");
  return data;
}

export async function registerFcmToken(payload: {
  fcmToken: string;
  platform?: "web" | "android" | "ios" | "unknown";
}) {
  const { data } = await http.post<{ success: boolean; deviceId?: string | null; idDevice?: string | null }>(
    "/auth/fcm-token/register",
    payload
  );
  return data;
}

export async function unregisterFcmToken(payload: { fcmToken: string }) {
  const { data } = await http.post<{ success: boolean }>("/auth/fcm-token/unregister", payload);
  return data;
}
