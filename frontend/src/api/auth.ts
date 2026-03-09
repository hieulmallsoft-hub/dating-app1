import { http } from "./http";
import type { AuthTokens } from "../lib/authStorage";

export type AuthUser = {
  id: string;
  email: string;
  accountCode: string | null;
  fullName: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  avatar: string | null;
  birthDate: string | null;
  role: string;
};

export type AuthResult = {
  user: AuthUser;
  tokens: AuthTokens;
  meta: {
    isNewUser: boolean;
    needsProfileSetup: boolean;
  };
};

export async function login(payload: { email: string; password: string }) {
  const { data } = await http.post<AuthResult>("/auth/login", payload);
  return data;
}

export async function register(payload: {
  email: string;
  password: string;
  fullName?: string;
}) {
  const { data } = await http.post<AuthResult>("/auth/register", payload);
  return data;
}

export async function logout() {
  const { data } = await http.post<{ success: boolean }>("/auth/logout");
  return data;
}

export type MeUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatar: string | null;
};

export async function getMe() {
  const { data } = await http.get<MeUser>("/users/me");
  return data;
}
