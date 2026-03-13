import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getHttpMessage, getHttpStatus } from "../api/error";
import { BACKEND_URL } from "../api/http";
import * as notificationsApi from "../api/notifications";
import { getAccessToken } from "../lib/authStorage";

type Props = {
  onAuthInvalid: () => void;
};

type SocketStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";
type LogLevel = "info" | "success" | "warn" | "error";

type RealtimeLog = {
  id: number;
  at: string;
  event: string;
  detail: string;
  level: LogLevel;
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

function toDetail(payload: unknown) {
  if (payload === null || payload === undefined) return "";
  if (typeof payload === "string") return payload;
  try {
    return JSON.stringify(payload);
  } catch {
    return "Unserializable payload";
  }
}

function toStatusLabel(status: SocketStatus) {
  if (status === "connected") return "Connected";
  if (status === "connecting") return "Connecting";
  if (status === "disconnected") return "Disconnected";
  if (status === "error") return "Connection Error";
  return "Idle";
}

export default function NotificationsPanel({ onAuthInvalid }: Props) {
  const [items, setItems] = useState<notificationsApi.AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("idle");
  const [roomJoined, setRoomJoined] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [lastRealtimeAt, setLastRealtimeAt] = useState<string | null>(null);
  const [logs, setLogs] = useState<RealtimeLog[]>([]);
  const [testTitle, setTestTitle] = useState("Web realtime test");
  const [testContent, setTestContent] = useState("Kiem tra notification realtime tu web");
  const [testType, setTestType] = useState("test");
  const [testTargetUserId, setTestTargetUserId] = useState("");

  const socketRef = useRef<Socket | null>(null);
  const logSeqRef = useRef(0);
  const loadRef = useRef<(silent?: boolean) => Promise<void>>(async () => undefined);

  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);

  const pushLog = useCallback((event: string, detail: string, level: LogLevel = "info") => {
    logSeqRef.current += 1;
    const at = new Date().toLocaleTimeString();
    const entry: RealtimeLog = {
      id: logSeqRef.current,
      at,
      event,
      detail,
      level,
    };
    setLogs((prev) => [entry, ...prev].slice(0, 60));
  }, []);

  const touchRealtime = useCallback(() => {
    setLastRealtimeAt(new Date().toLocaleTimeString());
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const data = await notificationsApi.getNotifications();
        setItems(data);
        if (!silent) {
          setSuccess(`Da tai ${data.length} notification`);
        }
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
    },
    [onAuthInvalid]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      setSocketStatus("idle");
      setRoomJoined(false);
      setSocketId(null);
      pushLog("socket:idle", "Missing access token");
      return;
    }

    setSocketStatus("connecting");
    pushLog("socket:init", `Connecting to ${BACKEND_URL}`);

    const socket: Socket = io(BACKEND_URL, {
      transports: ["websocket"],
      auth: {
        token: `Bearer ${accessToken}`,
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketStatus("connected");
      setSocketId(socket.id ?? null);
      pushLog("socket:connect", `id=${socket.id ?? "unknown"}`, "success");
      socket.emit("notification:join", {});
      pushLog("notification:join", "Join room requested");
      touchRealtime();
      void loadRef.current(true);
    });

    socket.on("notification:joined", (payload: unknown) => {
      setRoomJoined(true);
      pushLog("notification:joined", toDetail(payload), "success");
      touchRealtime();
    });

    socket.on("notification:left", (payload: unknown) => {
      setRoomJoined(false);
      pushLog("notification:left", toDetail(payload), "warn");
      touchRealtime();
    });

    socket.on("notification:new", (payload: unknown) => {
      const created = toSocketNotification(payload);
      if (!created) {
        pushLog("notification:new", "Ignored invalid payload", "warn");
        return;
      }

      setItems((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
      pushLog("notification:new", `${created.title} (${created.id})`, "success");
      touchRealtime();
    });

    socket.on("notification:read", (payload: unknown) => {
      const updated = toSocketNotification(payload);
      if (!updated) {
        pushLog("notification:read", "Ignored invalid payload", "warn");
        return;
      }

      setItems((prev) => {
        if (!prev.some((item) => item.id === updated.id)) {
          return [updated, ...prev];
        }
        return prev.map((item) => (item.id === updated.id ? updated : item));
      });
      pushLog("notification:read", `${updated.id}`, "info");
      touchRealtime();
    });

    socket.on("disconnect", (reason: string) => {
      setSocketStatus("disconnected");
      setRoomJoined(false);
      setSocketId(null);
      pushLog("socket:disconnect", reason || "unknown", "warn");
    });

    socket.on("connect_error", (connectError: Error) => {
      setSocketStatus("error");
      pushLog("socket:connect_error", connectError.message || "unknown", "error");
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
      pushLog("socket:exception", message || toDetail(payload), "error");
    });

    return () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      socket.disconnect();
    };
  }, [onAuthInvalid, pushLog, touchRealtime]);

  const emitJoinRoom = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      setError("Socket chua ket noi");
      return;
    }
    socket.emit("notification:join", {});
    pushLog("notification:join", "Join room requested");
  }, [pushLog]);

  const emitLeaveRoom = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      setError("Socket chua ket noi");
      return;
    }
    socket.emit("notification:leave", {});
    pushLog("notification:leave", "Leave room requested");
  }, [pushLog]);

  const reconnectSocket = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) {
      setError("Socket chua duoc tao");
      return;
    }
    setError(null);
    setSocketStatus("connecting");
    pushLog("socket:reconnect", "Reconnect requested");
    socket.connect();
  }, [pushLog]);

  const createTestNotification = useCallback(async () => {
    if (isSendingTest) return;

    const cleanTitle = testTitle.trim();
    const cleanContent = testContent.trim();
    if (!cleanTitle || !cleanContent) {
      setError("Title va content khong duoc de trong");
      return;
    }

    setIsSendingTest(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: notificationsApi.CreateTestNotificationPayload = {
        title: cleanTitle,
        content: cleanContent,
      };
      const cleanType = testType.trim();
      const cleanTargetUserId = testTargetUserId.trim();
      if (cleanType) payload.type = cleanType;
      if (cleanTargetUserId) payload.targetUserId = cleanTargetUserId;

      const created = await notificationsApi.createTestNotification(payload);
      setItems((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
      setSuccess("Da tao test notification");
      pushLog("api:notifications/test", `created=${created.id}`, "success");
      touchRealtime();
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Create test notification failed"));
      }
      pushLog("api:notifications/test", getHttpMessage(err, "Request failed"), "error");
    } finally {
      setIsSendingTest(false);
    }
  }, [isSendingTest, onAuthInvalid, pushLog, testContent, testTargetUserId, testTitle, testType, touchRealtime]);

  const markAsRead = async (id: string) => {
    if (isWorking) return;

    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await notificationsApi.markNotificationAsRead(id);
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSuccess("Da danh dau da doc");
      pushLog("api:mark-read", `id=${id}`, "info");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Mark as read failed"));
      }
      pushLog("api:mark-read", getHttpMessage(err, "Request failed"), "error");
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
      pushLog("api:mark-all-read", `${updates.length} notifications`, "info");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Mark all as read failed"));
      }
      pushLog("api:mark-all-read", getHttpMessage(err, "Request failed"), "error");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="panel notifications-panel">
      <div className="panel-title">
        <h3>Realtime Notification Lab</h3>
        <p>Kiem tra socket event va push pipeline ngay tren web</p>
      </div>

      {error ? <div className="panel-error">{error}</div> : null}
      {success ? <div className="panel-success">{success}</div> : null}

      <section className="notify-live-card">
        <div className="notify-live-main">
          <span className={`notify-status-dot ${socketStatus}`} />
          <div className="notify-live-text">
            <strong>{toStatusLabel(socketStatus)}</strong>
            <span>
              Socket ID: {socketId || "n/a"} | Room: {roomJoined ? "joined" : "not joined"} | Last event:{" "}
              {lastRealtimeAt || "--:--:--"}
            </span>
          </div>
        </div>
        <div className="notify-meta-pills">
          <span className={`notification-pill ${unreadCount ? "unread" : ""}`}>{unreadCount} chua doc</span>
          <span className="notification-pill">{logs.length} realtime logs</span>
        </div>
      </section>

      <section className="notify-action-grid">
        <button
          className="btn btn-small btn-outline"
          type="button"
          onClick={() => void load()}
          disabled={isLoading || isWorking}
        >
          Refresh list
        </button>
        <button
          className="btn btn-small btn-outline"
          type="button"
          onClick={() => void markAllAsRead()}
          disabled={isWorking || unreadCount === 0}
        >
          Read all
        </button>
        <button
          className="btn btn-small btn-outline"
          type="button"
          onClick={emitJoinRoom}
          disabled={socketStatus !== "connected"}
        >
          Join room
        </button>
        <button
          className="btn btn-small btn-outline"
          type="button"
          onClick={emitLeaveRoom}
          disabled={socketStatus !== "connected"}
        >
          Leave room
        </button>
        <button className="btn btn-small btn-outline" type="button" onClick={reconnectSocket}>
          Reconnect
        </button>
      </section>

      <section className="notify-test-card">
        <div className="notify-card-head">
          <strong>Create test notification</strong>
          <span>POST /notifications/test</span>
        </div>
        <div className="notify-form-grid">
          <label>
            <span>Title</span>
            <input value={testTitle} onChange={(event) => setTestTitle(event.target.value)} />
          </label>
          <label>
            <span>Type</span>
            <input value={testType} onChange={(event) => setTestType(event.target.value)} />
          </label>
          <label className="full">
            <span>Content</span>
            <textarea
              rows={2}
              value={testContent}
              onChange={(event) => setTestContent(event.target.value)}
            />
          </label>
          <label className="full">
            <span>Target User ID (optional)</span>
            <input
              placeholder="Bo trong de gui cho chinh minh"
              value={testTargetUserId}
              onChange={(event) => setTestTargetUserId(event.target.value)}
            />
          </label>
        </div>
        <button
          className="btn btn-small btn-primary"
          type="button"
          onClick={() => void createTestNotification()}
          disabled={isSendingTest}
        >
          {isSendingTest ? "Sending..." : "Send test"}
        </button>
      </section>

      <section className="notify-log-card">
        <div className="notify-card-head">
          <strong>Socket event timeline</strong>
          <span>Realtime diagnostics</span>
        </div>
        {!logs.length ? (
          <div className="hint">Chua co event log nao</div>
        ) : (
          <div className="notify-log-list">
            {logs.map((log) => (
              <div className={`notify-log-row ${log.level}`} key={log.id}>
                <div className="notify-log-meta">
                  <span>{log.at}</span>
                  <span>{log.event}</span>
                </div>
                <div className="notify-log-detail">{log.detail}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isLoading ? <div className="hint">Dang tai notifications...</div> : null}

      {!isLoading && !items.length ? <div className="hint">Chua co notification nao</div> : null}

      {items.length ? (
        <div className="notifications-list notifications-list--debug">
          {items.map((item) => (
            <div className={`notification-item ${item.isRead ? "read" : "unread"}`} key={item.id}>
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
