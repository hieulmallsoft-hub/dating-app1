import { useCallback, useEffect, useMemo, useState } from "react";
import { getHttpMessage, getHttpStatus } from "../api/error";
import * as notificationsApi from "../api/notifications";

type Props = {
  onAuthInvalid: () => void;
};

export default function NotificationsPanel({ onAuthInvalid }: Props) {
  const [items, setItems] = useState<notificationsApi.AppNotification[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("test");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    const timer = window.setInterval(() => {
      void load(true);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [load]);

  const createTestNotification = async () => {
    if (isWorking) return;

    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await notificationsApi.createTestNotification({
        title: title.trim() || undefined,
        content: content.trim() || undefined,
        type: type.trim() || undefined,
      });
      setItems((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
      setSuccess("Da tao test notification");
      setTitle("");
      setContent("");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Create notification failed"));
      }
    } finally {
      setIsWorking(false);
    }
  };

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
        <p>Test thong bao cua tai khoan hien tai</p>
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

      <div className="notification-form">
        <label className="auth-field">
          <span>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Mac dinh: Test notification"
          />
        </label>

        <label className="auth-field">
          <span>Content</span>
          <textarea
            className="textarea"
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Mac dinh: Created at ..."
          />
        </label>

        <label className="auth-field">
          <span>Type</span>
          <input
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="test"
          />
        </label>

        <button
          className="btn btn-primary"
          type="button"
          disabled={isWorking}
          onClick={() => void createTestNotification()}
        >
          {isWorking ? "Dang tao..." : "Create test notification"}
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
