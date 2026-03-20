import { http } from "./http";

export type CoupleEvent = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  isAnniversary: boolean;
  coupleId: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
};

export type EventPayload = {
  title: string;
  description?: string;
  date: string;
  isAnniversary?: boolean;
};

export async function getEvents() {
  const { data } = await http.get<CoupleEvent[]>("/events");
  return data;
}

export async function createEvent(payload: EventPayload) {
  const { data } = await http.post<CoupleEvent>("/events", payload);
  return data;
}

export async function updateEvent(id: string, payload: EventPayload) {
  const { data } = await http.patch<CoupleEvent>(`/events/${id}`, payload);
  return data;
}

export async function deleteEvent(id: string) {
  const { data } = await http.delete<{ success: boolean }>(`/events/${id}`);
  return data;
}
