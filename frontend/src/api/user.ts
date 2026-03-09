import { http } from "./http";

export type Gender = "MALE" | "FEMALE" | "OTHER";
export type GenderPreference = "MALE" | "FEMALE" | "BOTH";

export type UserMe = {
  id: string;
  email: string;
  fullName: string | null;
  avatar: string | null;
  photos: string[] | null;
  birthDate: string | null;
  gender: Gender | null;
  genderPreference: GenderPreference | null;
  bio: string | null;
  jobTitle: string | null;
  company: string | null;
  school: string | null;
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
  photos: string[];
  genderPreference: GenderPreference;
  bio: string;
  jobTitle: string;
  company: string;
  school: string;
}>;

export async function getMe() {
  const { data } = await http.get<UserMe>("/users/me");
  return data;
}

export async function updateMe(payload: UpdateMePayload) {
  const { data } = await http.put<UserMe>("/users/me", payload);
  return data;
}

export async function getAllUsers() {
  const { data } = await http.get<PublicUser[]>("/users");
  return data;
}

export async function getUserByEmail(email: string) {
  const { data } = await http.get<PublicUser | null>(`/users/email/${encodeURIComponent(email)}`);
  return data;
}

export async function getUserById(id: string) {
  const { data } = await http.get<PublicUser>(`/users/${id}`);
  return data;
}

export async function deleteUser(id: string) {
  const { data } = await http.delete<{ message: string }>(`/users/${id}`);
  return data;
}
