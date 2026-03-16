import { http } from "./http";

export type Gender = 0 | 1 | 2;

export type UserMe = {
  id: string;
  email: string;
  accountCode: string | null;
  fullName: string | null;
  avatar: string | null;
  birthDate: string | null;
  startDate?: string | null;
  startDateAt?: string | null;
  gender: Gender | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type PublicUser = UserMe & {
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateMePayload = Partial<{
  fullName: string;
  gender: Gender;
  birthDate: string;
  avatar: string;
}>;

export async function getMe() {
  const { data } = await http.get<UserMe>("/profile");
  return data;
}

export async function updateMe(payload: UpdateMePayload) {
  const { data } = await http.put<UserMe>("/profile", payload);
  return data;
}

export async function getUserByEmail(email: string) {
  const { data } = await http.get<PublicUser | null>(`/users/email/${encodeURIComponent(email)}`);
  return data;
}

export async function deleteMe() {
  const { data } = await http.delete<{ message: string }>("/profile");
  return data;
}
