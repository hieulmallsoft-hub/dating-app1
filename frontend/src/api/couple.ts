import { http } from "./http";

export type CoupleUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatar: string | null;
};

export type Couple = {
  id: string;
  user1Id: string;
  user2Id: string | null;
  status: "ACTIVE" | "DISCONNECTED";
  startDate: string | null;
  theme: string | null;
  createdAt: string;
  updatedAt: string;
  user1?: CoupleUser;
  user2?: CoupleUser | null;
  partner?: CoupleUser | null;
};

export type Invite = {
  id: string;
  inviterId: string;
  inviteCode: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED";
  expiresAt: string;
  createdAt: string;
};

export async function getMyCouple() {
  const { data } = await http.get<Couple>("/couple");
  return data;
}

export async function createInvite() {
  const { data } = await http.post<Invite>("/couple/invite");
  return data;
}

export async function joinCouple(inviteCode: string) {
  const { data } = await http.post<Couple>("/couple/join", { inviteCode });
  return data;
}

export async function connectNew(inviteCode: string) {
  const { data } = await http.post<Couple>("/couple/connect-new", { inviteCode });
  return data;
}

export async function setStartDate(startDate: string) {
  const { data } = await http.put<Couple>("/couple/start-date", { startDate });
  return data;
}

export async function setTheme(theme: string) {
  const { data } = await http.put<Couple>("/couple/theme", { theme });
  return data;
}

export async function disconnectCouple() {
  const { data } = await http.post<Couple>("/couple/disconnect");
  return data;
}
