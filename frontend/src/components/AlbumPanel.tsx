import { useCallback, useEffect, useMemo, useState } from "react";
import { getHttpMessage, getHttpStatus } from "../api/error";
import * as mediaApi from "../api/media";
import * as uploadsApi from "../api/uploads";

type Props = {
  onAuthInvalid: () => void;
};

export default function AlbumPanel({ onAuthInvalid }: Props) {
  const [filter, setFilter] = useState<mediaApi.AlbumFilter>("all");
  const [items, setItems] = useState<mediaApi.MediaItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canLoadMore = useMemo(
    () => Boolean(nextCursor) && !isLoading && !isWorking,
    [nextCursor, isLoading, isWorking]
  );

  const load = useCallback(
    async (mode: "reset" | "more") => {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const page = await mediaApi.getAlbum({
          filter,
          limit: 20,
          cursor: mode === "more" ? nextCursor : null,
        });
        setItems((prev) => (mode === "more" ? [...prev, ...page.items] : page.items));
        setNextCursor(page.nextCursor);
      } catch (err: unknown) {
        const status = getHttpStatus(err);
        if (status === 401) {
          onAuthInvalid();
        } else if (status === 404) {
          setItems([]);
          setNextCursor(null);
          setError("Ban chua ghep doi, hay ghep doi truoc khi dung album");
        } else {
          setError(getHttpMessage(err, "Failed to load album"));
        }
      } finally {
        setIsLoading(false);
      }
    },
    [filter, nextCursor, onAuthInvalid]
  );

  useEffect(() => {
    void load("reset");
  }, [filter, load]);

  const upload = async (file: File) => {
    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const uploaded = await uploadsApi.uploadFile(file);
      await mediaApi.createMedia({
        url: uploaded.fileUrl,
        type: uploaded.type,
      });
      await load("reset");
      setSuccess("Da tai len");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else if (status === 404) {
        setError("Ban chua ghep doi, hay ghep doi truoc khi dung album");
      } else {
        setError(getHttpMessage(err, "Upload failed"));
      }
    } finally {
      setIsWorking(false);
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    void upload(file);
  };

  const editCaption = async (item: mediaApi.MediaItem) => {
    const caption = window.prompt("Caption", item.caption || "");
    if (caption === null) return;

    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await mediaApi.updateMedia(item.id, { caption: caption.trim() || undefined });
      setItems((prev) => prev.map((m) => (m.id === item.id ? updated : m)));
      setSuccess("Da cap nhat");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Update failed"));
      }
    } finally {
      setIsWorking(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Xoa media nay?")) return;

    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      await mediaApi.deleteMedia(id);
      setItems((prev) => prev.filter((m) => m.id !== id));
      setSuccess("Da xoa");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Delete failed"));
      }
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Album</h3>
        <p>Anh va video trong couple</p>
      </div>

      {error ? <div className="panel-error">{error}</div> : null}
      {success ? <div className="panel-success">{success}</div> : null}

      <div className="album-toolbar">
        <div className="album-filters">
          <button
            className={`btn btn-small ${filter === "all" ? "btn-primary" : ""}`}
            onClick={() => setFilter("all")}
            type="button"
            disabled={isWorking}
          >
            All
          </button>
          <button
            className={`btn btn-small ${filter === "me" ? "btn-primary" : ""}`}
            onClick={() => setFilter("me")}
            type="button"
            disabled={isWorking}
          >
            Me
          </button>
          <button
            className={`btn btn-small ${filter === "partner" ? "btn-primary" : ""}`}
            onClick={() => setFilter("partner")}
            type="button"
            disabled={isWorking}
          >
            Partner
          </button>
        </div>

        <label className={`btn btn-small ${isWorking ? "btn-outline" : "btn-primary"}`}>
          {isWorking ? "Dang xu ly..." : "Upload"}
          <input type="file" accept="image/*,video/*" onChange={onPickFile} hidden disabled={isWorking} />
        </label>
      </div>

      {isLoading ? <div className="hint">Dang tai...</div> : null}

      {!isLoading && !items.length ? <div className="hint">Chua co media nao</div> : null}

      {items.length ? (
        <div className="album-grid">
          {items.map((m) => (
            <div className="album-item" key={m.id}>
              {m.type === "video" ? (
                <video className="album-thumb" src={m.url} controls preload="metadata" />
              ) : (
                <img className="album-thumb" src={m.url} alt={m.caption || "media"} loading="lazy" />
              )}

              <div className="album-meta">
                <div className="album-caption">{m.caption || (m.type === "video" ? "Video" : "Image")}</div>
                <div className="album-sub">{new Date(m.createdAt).toLocaleString()}</div>
                <div className="album-actions">
                  <button className="btn btn-small" onClick={() => void editCaption(m)} type="button" disabled={isWorking}>
                    Caption
                  </button>
                  <button className="btn btn-small" onClick={() => void remove(m.id)} type="button" disabled={isWorking}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {canLoadMore ? (
        <button className="btn btn-outline" onClick={() => void load("more")} type="button">
          Load more
        </button>
      ) : null}
    </div>
  );
}
