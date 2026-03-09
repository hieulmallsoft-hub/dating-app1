import { http } from "./http";

export async function setPin(pin: string) {
  const { data } = await http.post("/security/pin", { pin });
  return data;
}

export async function verifyPin(pin: string) {
  const { data } = await http.post<{ success: boolean }>("/security/verify-pin", { pin });
  return data;
}
