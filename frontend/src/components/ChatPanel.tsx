import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import * as chatApi from "../api/chat";
import { getHttpMessage, getHttpStatus } from "../api/error";
import { BACKEND_URL } from "../api/http";
import * as userApi from "../api/user";
import { getAccessToken } from "../lib/authStorage";

type Props = {
  onAuthInvalid: () => void;
};

function isNotInCoupleError(status: number | undefined, message: string) {
  if (status !== 404) return false;
  return message.toLowerCase().includes("not in a couple");
}

function getSocketErrorMessage(payload: unknown) {
  if (typeof payload === "string") return payload;
  if (
    typeof payload === "object" &&
    payload &&
    "message" in payload &&
    typeof (payload as { message?: unknown }).message === "string"
  ) {
    return (payload as { message: string }).message;
  }
  return "";
}

function sortMessages(items: chatApi.ChatMessage[]) {
  return [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export default function ChatPanel({ onAuthInvalid }: Props) {
  const [me, setMe] = useState<userApi.UserMe | null>(null);
  const [messages, setMessages] = useState<chatApi.ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [notInCouple, setNotInCouple] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const canSend = useMemo(
    () => Boolean(me?.id) && isConnected && !notInCouple,
    [me?.id, isConnected, notInCouple]
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [myProfile, chatMessages] = await Promise.all([
          userApi.getMe(),
          chatApi.getMessages({ limit: 100, offset: 0 }),
        ]);

        if (!active) return;
        setMe(myProfile);
        setNotInCouple(false);
        setMessages(sortMessages(chatMessages));
      } catch (err: unknown) {
        if (!active) return;
        const status = getHttpStatus(err);
        const message = getHttpMessage(err, "Failed to load chat");
        if (status === 401) {
          onAuthInvalid();
          return;
        }
        if (isNotInCoupleError(status, message)) {
          setNotInCouple(true);
          setMessages([]);
          try {
            const myProfile = await userApi.getMe();
            if (active) setMe(myProfile);
          } catch (profileError: unknown) {
            if (getHttpStatus(profileError) === 401) {
              onAuthInvalid();
              return;
            }
          }
          setError("Ban chua ghep doi, hay ghep doi truoc khi nhan tin");
        } else {
          setError(message);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [onAuthInvalid]);

  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken || !me?.id) return;

    const socket: Socket = io(BACKEND_URL, {
      transports: ["websocket"],
      auth: {
        token: `Bearer ${accessToken}`,
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join", {});
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("message:received", (message: chatApi.ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) {
          return prev;
        }
        return sortMessages([...prev, message]);
      });
    });

    socket.on("exception", (payload: unknown) => {
      const message = getSocketErrorMessage(payload);
      if (message.toLowerCase().includes("unauthorized")) {
        onAuthInvalid();
        return;
      }
      if (message) {
        setError(message);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [me?.id, onAuthInvalid]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = () => {
    const textarea = composerRef.current;
    const content = textarea?.value.trim() || "";
    if (!content || !me?.id) return;

    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      setError("Chat socket dang mat ket noi");
      return;
    }

    setError(null);
    socket.emit("message:send", {
      type: "TEXT",
      content,
    });
    if (textarea) {
      textarea.value = "";
      textarea.focus();
    }
  };

  const onDraftKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = async () => {
    if (notInCouple || !messages.length) return;
    if (!window.confirm("Xoa toan bo tin nhan cua couple?")) return;

    setIsClearing(true);
    setError(null);
    try {
      await chatApi.clearChat();
      setMessages([]);
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Clear chat failed"));
      }
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Chat</h3>
        <p>Nhan tin realtime cho couple</p>
      </div>

      {error ? <div className="panel-error">{error}</div> : null}

      <div className="chat-card">
        <div className="chat-status">
          {isConnected ? "Connected" : "Disconnected"}
        </div>

        <div className="chat-list">
          {isLoading ? <div className="hint">Dang tai tin nhan...</div> : null}
          {!isLoading && !messages.length ? (
            <div className="hint">
              {notInCouple ? "Chua co couple" : "Chua co tin nhan nao"}
            </div>
          ) : null}

          {messages.map((message) => {
            const mine = message.senderId === me?.id;
            const senderName = mine
              ? "You"
              : message.sender?.fullName || message.sender?.email || "Partner";

            return (
              <div className={`chat-row ${mine ? "mine" : ""}`} key={message.id}>
                <div className="chat-bubble">
                  <div className="chat-content">{message.content || ""}</div>
                  <div className="chat-meta">
                    <span>{senderName}</span>
                    <span>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={endRef} />
        </div>

        <div className="chat-tools">
          <button
            className="btn btn-small btn-outline"
            onClick={() => void clearChat()}
            disabled={isClearing || !messages.length || notInCouple}
            type="button"
          >
            {isClearing ? "Dang xoa..." : "Clear chat"}
          </button>
        </div>

        <div className="chat-composer">
          <textarea
            ref={composerRef}
            className="chat-input"
            onKeyDown={onDraftKeyDown}
            placeholder="Nhap tin nhan..."
            rows={2}
          />
          <button
            className="btn btn-small btn-primary"
            onClick={sendMessage}
            disabled={!canSend}
            type="button"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
