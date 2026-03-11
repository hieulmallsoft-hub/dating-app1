import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getHttpMessage, getHttpStatus } from "../api/error";
import { BACKEND_URL } from "../api/http";
import * as notificationsApi from "../api/notifications";
import { getAccessToken } from "../lib/authStorage";

type Props = {
  onAuthInvalid: () => void;
};

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

function toSocketNotification(payload: unknown): notificationsApi.AppNotification | null {
  if (!payload || typeof payload !== "object") return null;

  const raw = payload as Record<string, unknown>;
  if (
    typeof raw.id !== "string" ||
    typeof raw.userId !== "string" ||
    typeof raw.title !== "string" ||
    typeof raw.content !== "string" ||
    typeof raw.createdAt !== "string"
  ) {
    return null;
  }

  const parsedDate = new Date(raw.createdAt);
  if (Number.isNaN(parsedDate.getTime())) return null;

  return {
    id: raw.id,
    userId: raw.userId,
    title: raw.title,
    content: raw.content,
    type: typeof raw.type === "string" ? raw.type : null,
    isRead: Boolean(raw.isRead),
    createdAt: parsedDate.toISOString(),
  };
}

export default function NotificationsPanel({ onAuthInvalid }: Props) {
  const [items, setItems] = useState<notificationsApi.AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const loadRef = useRef<(silent?: boolean) => Promise<void>>(async () => undefined);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.isRead).length,
    [items]
  );

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const data = await notificationsApi.getNotifications();
      setItems(data);
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else if (!silent) {
        setError(getHttpMessage(err, "Failed to load notifications"));
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [onAuthInvalid]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) return;

    const socket: Socket = io(BACKEND_URL, {
      transports: ["websocket"],
      auth: {
        token: `Bearer ${accessToken}`,
      },
    });

    socket.on("connect", () => {
      socket.emit("notification:join", {});
      void loadRef.current(true);
    });

    socket.on("notification:new", (payload: unknown) => {
      const created = toSocketNotification(payload);
      if (!created) return;

      setItems((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
    });

    socket.on("notification:read", (payload: unknown) => {
      const updated = toSocketNotification(payload);
      if (!updated) return;

      setItems((prev) => {
        if (!prev.some((item) => item.id === updated.id)) {
          return [updated, ...prev];
        }
        return prev.map((item) => (item.id === updated.id ? updated : item));
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
    };
  }, [onAuthInvalid]);

  const markAsRead = async (id: string) => {
    if (isWorking) return;

    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await notificationsApi.markNotificationAsRead(id);
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSuccess("Da danh dau da doc");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Mark as read failed"));
      }
    } finally {
      setIsWorking(false);
    }
  };

  const markAllAsRead = async () => {
    const unreadItems = items.filter((item) => !item.isRead);
    if (!unreadItems.length || isWorking) return;

    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const updates = await Promise.all(
        unreadItems.map((item) => notificationsApi.markNotificationAsRead(item.id))
      );
      const updateMap = new Map(updates.map((item) => [item.id, item]));
      setItems((prev) => prev.map((item) => updateMap.get(item.id) ?? item));
      setSuccess("Da danh dau tat ca da doc");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Mark all as read failed"));
      }
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Notifications</h3>
        <p>Thong bao realtime cua tai khoan hien tai</p>
      </div>

      {error ? <div className="panel-error">{error}</div> : null}
      {success ? <div className="panel-success">{success}</div> : null}

      <div className="notification-toolbar">
        <span className={`notification-pill ${unreadCount ? "unread" : ""}`}>
          {unreadCount} chua doc
        </span>
        <button
          className="btn btn-small btn-outline"
          type="button"
          onClick={() => void load()}
          disabled={isLoading || isWorking}
        >
          Refresh
        </button>
        <button
          className="btn btn-small btn-outline"
          type="button"
          onClick={() => void markAllAsRead()}
          disabled={isWorking || unreadCount === 0}
        >
          Read all
        </button>
      </div>

      {isLoading ? <div className="hint">Dang tai notifications...</div> : null}

      {!isLoading && !items.length ? (
        <div className="hint">Chua co notification nao</div>
      ) : null}

      {items.length ? (
        <div className="notifications-list">
          {items.map((item) => (
            <div
              className={`notification-item ${item.isRead ? "read" : "unread"}`}
              key={item.id}
            >
              <div className="notification-head">
                <div className="notification-title">{item.title}</div>
                {item.type ? <span className="notification-type">{item.type}</span> : null}
              </div>
              <div className="notification-content">{item.content}</div>
              <div className="notification-foot">
                <span>{new Date(item.createdAt).toLocaleString()}</span>
                <button
                  className="btn btn-small btn-outline"
                  type="button"
                  disabled={isWorking || item.isRead}
                  onClick={() => void markAsRead(item.id)}
                >
                  {item.isRead ? "Read" : "Mark read"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
