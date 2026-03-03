import { useCallback, useEffect, useMemo, useState } from "react";
import * as eventsApi from "../api/events";
import { getHttpMessage, getHttpStatus } from "../api/error";

type Props = {
  onAuthInvalid: () => void;
};

function isNotInCoupleError(status: number | undefined, message: string) {
  if (status !== 404) return false;
  return message.toLowerCase().includes("not in a couple");
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export default function EventsPanel({ onAuthInvalid }: Props) {
  const [items, setItems] = useState<eventsApi.CoupleEvent[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [isAnniversary, setIsAnniversary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canCreate = useMemo(
    () => !isWorking && title.trim().length > 0 && date.length > 0,
    [isWorking, title, date]
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await eventsApi.getEvents();
      setItems(data);
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      const message = getHttpMessage(err, "Failed to load events");
      if (status === 401) {
        onAuthInvalid();
      } else if (isNotInCoupleError(status, message)) {
        setItems([]);
        setError("Ban chua ghep doi, hay ghep doi truoc khi tao su kien");
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onAuthInvalid]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!canCreate) return;

    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      await eventsApi.createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        date: new Date(date).toISOString(),
        isAnniversary,
      });
      setTitle("");
      setDescription("");
      setDate("");
      setIsAnniversary(false);
      await load();
      setSuccess("Da tao su kien");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Create event failed"));
      }
    } finally {
      setIsWorking(false);
    }
  };

  const edit = async (event: eventsApi.CoupleEvent) => {
    const nextTitle = window.prompt("Title", event.title);
    if (nextTitle === null) return;

    const nextDescription = window.prompt("Description", event.description || "");
    if (nextDescription === null) return;

    const nextDate = window.prompt("Date (YYYY-MM-DDTHH:mm)", toDateTimeLocal(event.date));
    if (nextDate === null) return;

    const parsedDate = new Date(nextDate);
    if (Number.isNaN(parsedDate.getTime())) {
      setError("Ngay khong hop le");
      return;
    }

    const nextIsAnniversary = window.confirm("Danh dau day la ngay ky niem? (OK = Co, Cancel = Khong)");

    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await eventsApi.updateEvent(event.id, {
        title: nextTitle.trim(),
        description: nextDescription.trim() || undefined,
        date: parsedDate.toISOString(),
        isAnniversary: nextIsAnniversary,
      });
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSuccess("Da cap nhat su kien");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Update event failed"));
      }
    } finally {
      setIsWorking(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Xoa su kien nay?")) return;

    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      await eventsApi.deleteEvent(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSuccess("Da xoa su kien");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Delete event failed"));
      }
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Su kien</h3>
        <p>Lich hen va moc ky niem cua couple</p>
      </div>

      {error ? <div className="panel-error">{error}</div> : null}
      {success ? <div className="panel-success">{success}</div> : null}

      <div className="events-form">
        <label className="auth-field">
          <span>Tieu de</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Hen an toi"
          />
        </label>

        <label className="auth-field">
          <span>Ngay gio</span>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label className="auth-field">
          <span>Mo ta</span>
          <textarea
            className="textarea"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Them mo ta neu can"
          />
        </label>

        <label className="events-check">
          <input
            type="checkbox"
            checked={isAnniversary}
            onChange={(e) => setIsAnniversary(e.target.checked)}
          />
          <span>Danh dau la ngay ky niem</span>
        </label>

        <button
          className="btn btn-primary"
          type="button"
          disabled={!canCreate}
          onClick={() => void create()}
        >
          {isWorking ? "Dang xu ly..." : "Tao su kien"}
        </button>
      </div>

      {isLoading ? <div className="hint">Dang tai su kien...</div> : null}

      {!isLoading && !items.length ? (
        <div className="hint">Chua co su kien nao</div>
      ) : null}

      {items.length ? (
        <div className="events-list">
          {items.map((event) => (
            <div className="event-item" key={event.id}>
              <div className="event-head">
                <div className="event-title">{event.title}</div>
                {event.isAnniversary ? <span className="event-badge">Ky niem</span> : null}
              </div>

              <div className="event-date">{new Date(event.date).toLocaleString()}</div>
              {event.description ? <div className="event-desc">{event.description}</div> : null}

              <div className="event-actions">
                <button
                  className="btn btn-small"
                  type="button"
                  disabled={isWorking}
                  onClick={() => void edit(event)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-small"
                  type="button"
                  disabled={isWorking}
                  onClick={() => void remove(event.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

