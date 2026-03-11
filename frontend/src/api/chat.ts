import { http } from "./http";

export type ChatMessageType = "TEXT" | "IMAGE" | "VOICE" | "LOCATION";

export type ChatMessageSender = {
  id: string;
  email: string;
  fullName: string | null;
  avatar: string | null;
};

export type ChatMessage = {
  id: string;
  coupleId: string;
  senderId: string;
  type: ChatMessageType;
  content: string | null;
  isRead: boolean;
  createdAt: string;
  sender?: ChatMessageSender;
};

export async function getMessages(params?: { limit?: number; offset?: number }) {
  const { data } = await http.get<ChatMessage[]>("/chat/history", {
    params: {
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
    },
  });
  return data;
}

export async function clearChat() {
  const { data } = await http.post<{ success: boolean }>("/chat/history/clear");
  return data;
}
