import { useCallback, useEffect, useMemo, useState } from "react";
import { getHttpMessage, getHttpStatus } from "../api/error";
import * as tripsApi from "../api/trips";

type Props = {
  onAuthInvalid: () => void;
};

function createSampleSyncInput() {
  const now = Date.now();
  const start = now - 20 * 60 * 1000;
  return JSON.stringify(
    [
      {
        id: `trip-${now}`,
        startTime: start,
        endTime: now,
        distanceKm: 5.4,
        startAddress: "Home",
        endAddress: "Coffee shop",
        routePoints: [
          { lat: 10.7765, lng: 106.7009 },
          { lat: 10.7758, lng: 106.7022 },
          { lat: 10.7749, lng: 106.7037 },
        ],
      },
    ],
    null,
    2
  );
}

export default function TripsPanel({ onAuthInvalid }: Props) {
  const [userIdFilter, setUserIdFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [items, setItems] = useState<tripsApi.TripItem[]>([]);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<tripsApi.TripDetail | null>(null);
  const [syncInput, setSyncInput] = useState(createSampleSyncInput);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const maxPage = useMemo(() => Math.max(1, Math.ceil(total / Math.max(1, limit))), [total, limit]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await tripsApi.listTrips({
        userId: userIdFilter.trim() || undefined,
        page,
        limit,
      });
      setItems(response.data);
      setTotal(response.total);
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Failed to load trips"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [limit, onAuthInvalid, page, userIdFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const sync = async () => {
    if (isWorking) return;

    let trips: tripsApi.TripSyncItem[];
    try {
      const parsed = JSON.parse(syncInput);
      if (!Array.isArray(parsed)) {
        setError("JSON phai la mot array trips");
        return;
      }
      trips = parsed as tripsApi.TripSyncItem[];
    } catch {
      setError("JSON khong hop le");
      return;
    }

    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await tripsApi.syncTrips(trips);
      setSuccess(`Da sync ${result.count} trip`);
      await load();
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Sync trips failed"));
      }
    } finally {
      setIsWorking(false);
    }
  };

  const viewDetail = async (id: string) => {
    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await tripsApi.getTripDetail(id);
      setDetail(data);
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Load trip detail failed"));
      }
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Trips</h3>
        <p>Sync va xem lich su chuyen di</p>
      </div>

      {error ? <div className="panel-error">{error}</div> : null}
      {success ? <div className="panel-success">{success}</div> : null}

      <div className="events-form">
        <label className="auth-field">
          <span>UserId filter (optional)</span>
          <input
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            placeholder="uuid user muon xem"
          />
        </label>

        <div className="grid-2">
          <label className="auth-field">
            <span>Page</span>
            <input
              type="number"
              min={1}
              value={page}
              onChange={(e) => setPage(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>

          <label className="auth-field">
            <span>Limit</span>
            <input
              type="number"
              min={1}
              max={100}
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(100, Number(e.target.value) || 20)))}
            />
          </label>
        </div>

        <button className="btn btn-outline" type="button" onClick={() => void load()}>
          Reload list
        </button>

        <label className="auth-field">
          <span>Trips JSON for sync</span>
          <textarea
            className="textarea"
            rows={8}
            value={syncInput}
            onChange={(e) => setSyncInput(e.target.value)}
          />
        </label>

        <button className="btn btn-primary" type="button" disabled={isWorking} onClick={() => void sync()}>
          {isWorking ? "Dang xu ly..." : "Sync trips"}
        </button>
      </div>

      {isLoading ? <div className="hint">Dang tai trips...</div> : null}
      {!isLoading ? <div className="hint">Tong: {total} | Trang toi da: {maxPage}</div> : null}

      {items.length ? (
        <div className="events-list">
          {items.map((trip) => (
            <div className="event-item" key={trip.id}>
              <div className="event-head">
                <div className="event-title">{trip.id}</div>
                <span className="event-badge">{trip.distanceKm.toFixed(2)} km</span>
              </div>
              <div className="event-desc">
                {new Date(trip.startTime).toLocaleString()} {"->"} {new Date(trip.endTime).toLocaleString()}
              </div>
              <div className="event-desc">
                {trip.startAddress || "-"} {"->"} {trip.endAddress || "-"}
              </div>
              <div className="event-actions">
                <button
                  className="btn btn-small"
                  type="button"
                  disabled={isWorking}
                  onClick={() => void viewDetail(trip.id)}
                >
                  Detail
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {detail ? (
        <div className="event-item" style={{ marginTop: 14 }}>
          <div className="event-head">
            <div className="event-title">Trip detail: {detail.id}</div>
            <span className="event-badge">
              points: {Array.isArray(detail.routeFull) ? detail.routeFull.length : 0}
            </span>
          </div>
          <div className="event-desc">
            Route preview: {Array.isArray(detail.routePreview) ? detail.routePreview.length : 0}
          </div>
          <div className="event-desc">
            Route full (first 10):{" "}
            {Array.isArray(detail.routeFull)
              ? detail.routeFull
                  .slice(0, 10)
                  .map((point) => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`)
                  .join(" | ")
              : "-"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
