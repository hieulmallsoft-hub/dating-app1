import { http } from "./http";

export async function logout() {
  const { data } = await http.post<{ success: boolean }>("/auth/logout");
  return data;
}
