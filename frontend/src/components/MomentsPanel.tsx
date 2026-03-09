import { useCallback, useEffect, useMemo, useState } from "react";
import { getHttpMessage, getHttpStatus } from "../api/error";
import * as momentsApi from "../api/moments";

type Props = {
  onAuthInvalid: () => void;
};

function parsePhotos(text: string) {
  return Array.from(
    new Set(
      text
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export default function MomentsPanel({ onAuthInvalid }: Props) {
  const [items, setItems] = useState<momentsApi.MomentItem[]>([]);
  const [content, setContent] = useState("");
  const [photosText, setPhotosText] = useState("");
  const [privacy, setPrivacy] = useState<momentsApi.MomentPrivacy>("COUPLE");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const photos = useMemo(() => parsePhotos(photosText), [photosText]);
  const canCreate = useMemo(
    () => !isWorking && (content.trim().length > 0 || photos.length > 0),
    [isWorking, content, photos.length]
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await momentsApi.getMoments();
      setItems(data);
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Failed to load moments"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [onAuthInvalid]);

  useEffect(() => {
    void load();
  }, [load]);

  const createMoment = async () => {
    if (!canCreate) return;
    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await momentsApi.createMoment({
        content: content.trim() || undefined,
        photos: photos.length ? photos : undefined,
        privacy,
      });
      setItems((prev) => [created, ...prev]);
      setContent("");
      setPhotosText("");
      setPrivacy("COUPLE");
      setSuccess("Da tao moment");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Create moment failed"));
      }
    } finally {
      setIsWorking(false);
    }
  };

  const editMoment = async (item: momentsApi.MomentItem) => {
    const nextContent = window.prompt("Content", item.content || "");
    if (nextContent === null) return;

    const nextPrivacyInput = window.prompt("Privacy (COUPLE/PRIVATE)", item.privacy);
    if (nextPrivacyInput === null) return;
    const nextPrivacy = nextPrivacyInput.trim().toUpperCase();
    if (nextPrivacy !== "COUPLE" && nextPrivacy !== "PRIVATE") {
      setError("Privacy phai la COUPLE hoac PRIVATE");
      return;
    }

    const nextPhotosInput = window.prompt(
      "Photos (moi dong 1 URL)",
      (item.photos || []).join("\n")
    );
    if (nextPhotosInput === null) return;

    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await momentsApi.updateMoment(item.id, {
        content: nextContent.trim() || undefined,
        privacy: nextPrivacy as momentsApi.MomentPrivacy,
        photos: parsePhotos(nextPhotosInput),
      });
      setItems((prev) => prev.map((moment) => (moment.id === updated.id ? updated : moment)));
      setSuccess("Da cap nhat moment");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Update moment failed"));
      }
    } finally {
      setIsWorking(false);
    }
  };

  const removeMoment = async (id: string) => {
    if (!window.confirm("Xoa moment nay?")) return;
    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      await momentsApi.deleteMoment(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSuccess("Da xoa moment");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Delete moment failed"));
      }
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Moments</h3>
        <p>Feed moment cua couple</p>
      </div>

      {error ? <div className="panel-error">{error}</div> : null}
      {success ? <div className="panel-success">{success}</div> : null}

      <div className="events-form">
        <label className="auth-field">
          <span>Content</span>
          <textarea
            className="textarea"
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Noi dung moment"
          />
        </label>

        <label className="auth-field">
          <span>Photos (moi dong 1 URL)</span>
          <textarea
            className="textarea"
            rows={3}
            value={photosText}
            onChange={(e) => setPhotosText(e.target.value)}
            placeholder="https://..."
          />
        </label>

        <label className="auth-field">
          <span>Privacy</span>
          <select
            className="select"
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as momentsApi.MomentPrivacy)}
          >
            <option value="COUPLE">COUPLE</option>
            <option value="PRIVATE">PRIVATE</option>
          </select>
        </label>

        <button
          className="btn btn-primary"
          type="button"
          disabled={!canCreate}
          onClick={() => void createMoment()}
        >
          {isWorking ? "Dang xu ly..." : "Tao moment"}
        </button>
      </div>

      {isLoading ? <div className="hint">Dang tai moments...</div> : null}
      {!isLoading && !items.length ? <div className="hint">Chua co moment nao</div> : null}

      {items.length ? (
        <div className="events-list">
          {items.map((item) => (
            <div className="event-item" key={item.id}>
              <div className="event-head">
                <div className="event-title">
                  {item.creator?.fullName || item.creator?.email || "Moment"}
                </div>
                <span className="event-badge">{item.privacy}</span>
              </div>

              {item.content ? <div className="event-desc">{item.content}</div> : null}
              {item.photos?.length ? (
                <div className="photos-list">
                  {item.photos.map((url) => (
                    <div className="photo-row" key={`${item.id}-${url}`}>
                      <span className="photo-url">{url}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="event-date">{new Date(item.createdAt).toLocaleString()}</div>

              <div className="event-actions">
                <button
                  className="btn btn-small"
                  type="button"
                  disabled={isWorking}
                  onClick={() => void editMoment(item)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-small"
                  type="button"
                  disabled={isWorking}
                  onClick={() => void removeMoment(item.id)}
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
