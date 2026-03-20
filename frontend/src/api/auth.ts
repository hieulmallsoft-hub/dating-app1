import { http } from "./http";

export type AuthSessionResponse = {
  user: {
    id: string;
    accountCode: string | null;
    sub: string | null;
    email: string;
    fullName: string | null;
    gender: 0 | 1 | 2 | null;
    avatar: string | null;
    birthDate: string | null;
    role: string;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
  };
  meta: {
    isNewUser: boolean;
    needsProfileSetup: boolean;
  };
  deviceId?: string | null;
  idDevice?: string | null;
  iddevice?: string | null;
};

export async function localRegister(payload: {
  email: string;
  password: string;
  fullName?: string;
}) {
  const { data } = await http.post<AuthSessionResponse>("/auth/local/register", payload);
  return data;
}

export async function localLogin(payload: { email: string; password: string }) {
  const { data } = await http.post<AuthSessionResponse>("/auth/local/login", payload);
  return data;
}

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
