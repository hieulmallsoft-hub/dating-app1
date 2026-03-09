import { useCallback, useEffect, useMemo, useState } from "react";
import { getHttpMessage, getHttpStatus } from "../api/error";
import * as mediaApi from "../api/media";
import * as placesApi from "../api/places";
import * as securityApi from "../api/security";
import * as settingsApi from "../api/settings";
import * as uploadsApi from "../api/uploads";
import * as userApi from "../api/user";

type Props = {
  onAuthInvalid: () => void;
};

type OpsTab = "settings" | "security" | "places" | "users" | "media" | "uploads";

const PLACE_TYPES: placesApi.PlaceType[] = [
  "HOME",
  "SCHOOL",
  "COMPANY",
  "RESTAURANT",
  "CAFE",
  "PARK",
  "MUSEUM",
  "OTHER",
];

const MEDIA_STATUSES: mediaApi.MediaStatus[] = ["processing", "active", "flagged", "synced"];

export default function OpsPanel({ onAuthInvalid }: Props) {
  const [tab, setTab] = useState<OpsTab>("settings");
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [settings, setSettings] = useState<settingsApi.AppSettings | null>(null);

  const [setPinInput, setSetPinInput] = useState("");
  const [verifyPinInput, setVerifyPinInput] = useState("");

  const [places, setPlaces] = useState<placesApi.PlaceItem[]>([]);
  const [placeName, setPlaceName] = useState("");
  const [placeAddress, setPlaceAddress] = useState("");
  const [placeLat, setPlaceLat] = useState("");
  const [placeLng, setPlaceLng] = useState("");
  const [placeRadius, setPlaceRadius] = useState("200");
  const [placeType, setPlaceType] = useState<placesApi.PlaceType>("OTHER");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<placesApi.SearchPlaceItem[]>([]);
  const [geofencePlaceId, setGeofencePlaceId] = useState("");
  const [geofenceTransition, setGeofenceTransition] = useState<"ENTER" | "EXIT">("ENTER");

  const [userEmailQuery, setUserEmailQuery] = useState("");
  const [userByEmail, setUserByEmail] = useState<userApi.PublicUser | null>(null);

  const [mediaId, setMediaId] = useState("");
  const [mediaItem, setMediaItem] = useState<mediaApi.MediaItem | null>(null);
  const [mediaDownloadUrl, setMediaDownloadUrl] = useState<string | null>(null);
  const [nextMediaStatus, setNextMediaStatus] = useState<mediaApi.MediaStatus>("active");

  const [presignFileName, setPresignFileName] = useState("sample.jpg");
  const [presignType, setPresignType] = useState<"image" | "video" | "voice">("image");
  const [presignResult, setPresignResult] = useState<unknown>(null);

  const handleFailure = useCallback(
    (err: unknown, fallback: string) => {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
        return;
      }
      setError(getHttpMessage(err, fallback));
    },
    [onAuthInvalid]
  );

  const runAction = useCallback(
    async (action: () => Promise<void>) => {
      if (isWorking) return;
      setIsWorking(true);
      setError(null);
      setSuccess(null);
      try {
        await action();
      } finally {
        setIsWorking(false);
      }
    },
    [isWorking]
  );

  const loadSettings = useCallback(async () => {
    try {
      const data = await settingsApi.getSettings();
      setSettings(data);
    } catch (err: unknown) {
      handleFailure(err, "Failed to load settings");
    }
  }, [handleFailure]);

  const loadPlaces = useCallback(async () => {
    try {
      const data = await placesApi.getPlaces();
      setPlaces(data);
    } catch (err: unknown) {
      handleFailure(err, "Failed to load places");
    }
  }, [handleFailure]);

  useEffect(() => {
    void loadSettings();
    void loadPlaces();
  }, [loadPlaces, loadSettings]);

  const placeCount = useMemo(() => places.filter((item) => !item.isDeleted).length, [places]);

  const createPlace = async () => {
    await runAction(async () => {
      try {
        const created = await placesApi.createPlace({
          name: placeName.trim(),
          address: placeAddress.trim() || undefined,
          latitude: placeLat.trim() ? Number(placeLat) : undefined,
          longitude: placeLng.trim() ? Number(placeLng) : undefined,
          placeType,
          radius: Number(placeRadius) || 200,
        });
        setPlaces((prev) => [created, ...prev]);
        setPlaceName("");
        setPlaceAddress("");
        setPlaceLat("");
        setPlaceLng("");
        setPlaceRadius("200");
        setSuccess("Da tao place");
      } catch (err: unknown) {
        handleFailure(err, "Create place failed");
      }
    });
  };

  const updatePlaceQuick = async (place: placesApi.PlaceItem) => {
    const nextName = window.prompt("Place name", place.name);
    if (nextName === null) return;
    const nextAddress = window.prompt("Address", place.address || "");
    if (nextAddress === null) return;
    await runAction(async () => {
      try {
        const updated = await placesApi.updatePlace(place.id, {
          name: nextName.trim() || place.name,
          address: nextAddress.trim() || undefined,
        });
        setPlaces((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setSuccess("Da cap nhat place");
      } catch (err: unknown) {
        handleFailure(err, "Update place failed");
      }
    });
  };

  const deletePlace = async (id: string) => {
    if (!window.confirm("Xoa place nay?")) return;
    await runAction(async () => {
      try {
        await placesApi.deletePlace(id);
        await loadPlaces();
        setSuccess("Da xoa place");
      } catch (err: unknown) {
        handleFailure(err, "Delete place failed");
      }
    });
  };

  const searchPlace = async () => {
    if (searchQuery.trim().length < 2) {
      setError("Nhap it nhat 2 ky tu de search");
      return;
    }
    await runAction(async () => {
      try {
        const data = await placesApi.searchPlaces(searchQuery.trim());
        setSearchResults(data);
        setSuccess(`Tim thay ${data.length} ket qua`);
      } catch (err: unknown) {
        handleFailure(err, "Search place failed");
      }
    });
  };

  const sendGeofence = async () => {
    if (!geofencePlaceId.trim()) {
      setError("Nhap placeId de test geofence");
      return;
    }
    await runAction(async () => {
      try {
        await placesApi.sendGeofenceEvent({
          placeId: geofencePlaceId.trim(),
          transition: geofenceTransition,
          timestamp: Date.now(),
        });
        setSuccess("Da gui geofence event");
      } catch (err: unknown) {
        handleFailure(err, "Geofence event failed");
      }
    });
  };

  const saveSettings = async () => {
    if (!settings) return;
    await runAction(async () => {
      try {
        const updated = await settingsApi.updateSettings({
          notificationEnabled: settings.notificationEnabled,
          theme: settings.theme,
          privacy: settings.privacy,
        });
        setSettings(updated);
        setSuccess("Da luu settings");
      } catch (err: unknown) {
        handleFailure(err, "Save settings failed");
      }
    });
  };

  const setPin = async () => {
    if (!/^\d{4}$/.test(setPinInput.trim())) {
      setError("PIN phai dung 4 chu so");
      return;
    }
    await runAction(async () => {
      try {
        await securityApi.setPin(setPinInput.trim());
        setSetPinInput("");
        setSuccess("Da dat PIN");
      } catch (err: unknown) {
        handleFailure(err, "Set PIN failed");
      }
    });
  };

  const verifyPin = async () => {
    if (!/^\d{4}$/.test(verifyPinInput.trim())) {
      setError("PIN phai dung 4 chu so");
      return;
    }
    await runAction(async () => {
      try {
        await securityApi.verifyPin(verifyPinInput.trim());
        setSuccess("PIN dung");
      } catch (err: unknown) {
        handleFailure(err, "Verify PIN failed");
      }
    });
  };

  const findUserByEmail = async () => {
    if (!userEmailQuery.trim()) return;
    await runAction(async () => {
      try {
        const data = await userApi.getUserByEmail(userEmailQuery.trim());
        setUserByEmail(data);
        setSuccess(data ? "Tim thay user theo email" : "Khong tim thay user");
      } catch (err: unknown) {
        handleFailure(err, "Find user by email failed");
      }
    });
  };

  const removeUser = async () => {
    if (!window.confirm("Xoa tai khoan hien tai? Hanh dong nay khong the hoan tac.")) return;
    await runAction(async () => {
      try {
        await userApi.deleteMe();
        setSuccess("Tai khoan da duoc xoa");
        onAuthInvalid();
      } catch (err: unknown) {
        handleFailure(err, "Delete user failed");
      }
    });
  };

  const inspectMedia = async () => {
    if (!mediaId.trim()) return;
    await runAction(async () => {
      try {
        const [media, download] = await Promise.all([
          mediaApi.getMediaById(mediaId.trim()),
          mediaApi.getMediaDownloadUrl(mediaId.trim()),
        ]);
        setMediaItem(media);
        setMediaDownloadUrl(download.downloadUrl || null);
        setNextMediaStatus(media.status);
        setSuccess("Da tai thong tin media");
      } catch (err: unknown) {
        handleFailure(err, "Inspect media failed");
      }
    });
  };

  const updateMediaStatus = async () => {
    if (!mediaId.trim()) return;
    await runAction(async () => {
      try {
        const updated = await mediaApi.updateMediaStatus(mediaId.trim(), nextMediaStatus);
        setMediaItem(updated);
        setSuccess("Da cap nhat status media");
      } catch (err: unknown) {
        handleFailure(err, "Update media status failed");
      }
    });
  };

  const testPresign = async () => {
    await runAction(async () => {
      try {
        const result = await uploadsApi.createPresign({
          fileName: presignFileName.trim(),
          type: presignType,
        });
        setPresignResult(result);
        setSuccess("Presign endpoint da tra ve response");
      } catch (err: unknown) {
        setPresignResult(null);
        handleFailure(err, "Presign failed");
      }
    });
  };

  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Ops</h3>
        <p>UI cho cac endpoint backend con lai</p>
      </div>

      {error ? <div className="panel-error">{error}</div> : null}
      {success ? <div className="panel-success">{success}</div> : null}

      <div className="location-action-row" style={{ marginTop: 14 }}>
        <button className={`location-tab-btn ${tab === "settings" ? "active" : ""}`} type="button" onClick={() => setTab("settings")}>
          Settings
        </button>
        <button className={`location-tab-btn ${tab === "security" ? "active" : ""}`} type="button" onClick={() => setTab("security")}>
          Security
        </button>
        <button className={`location-tab-btn ${tab === "places" ? "active" : ""}`} type="button" onClick={() => setTab("places")}>
          Places
        </button>
        <button className={`location-tab-btn ${tab === "users" ? "active" : ""}`} type="button" onClick={() => setTab("users")}>
          Users
        </button>
        <button className={`location-tab-btn ${tab === "media" ? "active" : ""}`} type="button" onClick={() => setTab("media")}>
          Media
        </button>
        <button className={`location-tab-btn ${tab === "uploads" ? "active" : ""}`} type="button" onClick={() => setTab("uploads")}>
          Uploads
        </button>
      </div>

      {tab === "settings" && settings ? (
        <div className="events-form">
          <label className="events-check">
            <input
              type="checkbox"
              checked={settings.notificationEnabled}
              onChange={(e) => setSettings((prev) => (prev ? { ...prev, notificationEnabled: e.target.checked } : prev))}
            />
            <span>notificationEnabled</span>
          </label>
          <label className="auth-field">
            <span>theme</span>
            <select
              className="select"
              value={settings.theme}
              onChange={(e) =>
                setSettings((prev) =>
                  prev
                    ? { ...prev, theme: e.target.value as "light" | "dark" | "system" }
                    : prev
                )
              }
            >
              <option value="light">light</option>
              <option value="dark">dark</option>
              <option value="system">system</option>
            </select>
          </label>
          <label className="auth-field">
            <span>privacy</span>
            <select
              className="select"
              value={settings.privacy}
              onChange={(e) =>
                setSettings((prev) =>
                  prev
                    ? { ...prev, privacy: e.target.value as "public" | "friends" | "private" }
                    : prev
                )
              }
            >
              <option value="public">public</option>
              <option value="friends">friends</option>
              <option value="private">private</option>
            </select>
          </label>
          <button className="btn btn-primary" type="button" disabled={isWorking} onClick={() => void saveSettings()}>
            Save settings
          </button>
        </div>
      ) : null}

      {tab === "security" ? (
        <div className="events-form">
          <label className="auth-field">
            <span>Set PIN (4 so)</span>
            <input
              value={setPinInput}
              maxLength={4}
              onChange={(e) => setSetPinInput(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <button className="btn btn-primary" type="button" disabled={isWorking} onClick={() => void setPin()}>
            Set PIN
          </button>

          <label className="auth-field">
            <span>Verify PIN</span>
            <input
              value={verifyPinInput}
              maxLength={4}
              onChange={(e) => setVerifyPinInput(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <button className="btn btn-outline" type="button" disabled={isWorking} onClick={() => void verifyPin()}>
            Verify PIN
          </button>
        </div>
      ) : null}

      {tab === "places" ? (
        <div className="events-form">
          <div className="hint">Places active: {placeCount}</div>
          <label className="auth-field">
            <span>Search place</span>
            <div className="join-row">
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="VD: cafe district 1" className="join-input" />
              <button className="btn btn-small" type="button" disabled={isWorking} onClick={() => void searchPlace()}>
                Search
              </button>
            </div>
          </label>
          {searchResults.length ? (
            <div className="location-history-list">
              {searchResults.slice(0, 6).map((item) => (
                <div className="location-history-item" key={item.id}>
                  <div className="location-history-main">{item.name}</div>
                  <div className="location-history-sub">
                    {item.latitude ?? "-"}, {item.longitude ?? "-"} | {item.placeType}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <label className="auth-field">
            <span>New place name</span>
            <input value={placeName} onChange={(e) => setPlaceName(e.target.value)} />
          </label>
          <label className="auth-field">
            <span>Address</span>
            <input value={placeAddress} onChange={(e) => setPlaceAddress(e.target.value)} />
          </label>
          <div className="grid-2">
            <label className="auth-field">
              <span>Latitude</span>
              <input value={placeLat} onChange={(e) => setPlaceLat(e.target.value)} />
            </label>
            <label className="auth-field">
              <span>Longitude</span>
              <input value={placeLng} onChange={(e) => setPlaceLng(e.target.value)} />
            </label>
          </div>
          <div className="grid-2">
            <label className="auth-field">
              <span>Radius</span>
              <input value={placeRadius} onChange={(e) => setPlaceRadius(e.target.value)} />
            </label>
            <label className="auth-field">
              <span>Type</span>
              <select
                className="select"
                value={placeType}
                onChange={(e) => setPlaceType(e.target.value as placesApi.PlaceType)}
              >
                {PLACE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="btn btn-primary" type="button" disabled={isWorking} onClick={() => void createPlace()}>
            Create place
          </button>
          <button className="btn btn-outline" type="button" disabled={isWorking} onClick={() => void loadPlaces()}>
            Reload places
          </button>

          <label className="auth-field">
            <span>Geofence test placeId</span>
            <input value={geofencePlaceId} onChange={(e) => setGeofencePlaceId(e.target.value)} />
          </label>
          <label className="auth-field">
            <span>Transition</span>
            <select
              className="select"
              value={geofenceTransition}
              onChange={(e) => setGeofenceTransition(e.target.value as "ENTER" | "EXIT")}
            >
              <option value="ENTER">ENTER</option>
              <option value="EXIT">EXIT</option>
            </select>
          </label>
          <button className="btn btn-outline" type="button" disabled={isWorking} onClick={() => void sendGeofence()}>
            Send geofence event
          </button>

          {places.length ? (
            <div className="events-list">
              {places.slice(0, 20).map((place) => (
                <div className="event-item" key={place.id}>
                  <div className="event-head">
                    <div className="event-title">{place.name}</div>
                    <span className="event-badge">{place.placeType}</span>
                  </div>
                  <div className="event-desc">{place.id}</div>
                  <div className="event-actions">
                    <button className="btn btn-small" type="button" disabled={isWorking} onClick={() => void updatePlaceQuick(place)}>
                      Edit
                    </button>
                    <button className="btn btn-small" type="button" disabled={isWorking} onClick={() => void deletePlace(place.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "users" ? (
        <div className="events-form">
          <label className="auth-field">
            <span>Find by email</span>
            <div className="join-row">
              <input value={userEmailQuery} onChange={(e) => setUserEmailQuery(e.target.value)} className="join-input" />
              <button className="btn btn-small" type="button" disabled={isWorking} onClick={() => void findUserByEmail()}>
                Find
              </button>
            </div>
          </label>
          {userByEmail ? <div className="hint">Email result: {userByEmail.id} - {userByEmail.email}</div> : null}

          <label className="auth-field">
            <span>Delete current account</span>
            <div className="join-row">
              <button className="btn btn-small" type="button" disabled={isWorking} onClick={() => void removeUser()}>
                Delete account
              </button>
            </div>
          </label>
        </div>
      ) : null}

      {tab === "media" ? (
        <div className="events-form">
          <label className="auth-field">
            <span>Media id</span>
            <input value={mediaId} onChange={(e) => setMediaId(e.target.value)} />
          </label>
          <button className="btn btn-outline" type="button" disabled={isWorking} onClick={() => void inspectMedia()}>
            Inspect media
          </button>

          <label className="auth-field">
            <span>Update status</span>
            <select
              className="select"
              value={nextMediaStatus}
              onChange={(e) => setNextMediaStatus(e.target.value as mediaApi.MediaStatus)}
            >
              {MEDIA_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" type="button" disabled={isWorking} onClick={() => void updateMediaStatus()}>
            Update media status
          </button>

          {mediaItem ? (
            <div className="event-item">
              <div className="event-head">
                <div className="event-title">{mediaItem.id}</div>
                <span className="event-badge">{mediaItem.status}</span>
              </div>
              <div className="event-desc">Type: {mediaItem.type}</div>
              <div className="event-desc">URL: {mediaItem.url}</div>
              <div className="event-desc">Download URL: {mediaDownloadUrl || "(none)"}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "uploads" ? (
        <div className="events-form">
          <label className="auth-field">
            <span>fileName</span>
            <input value={presignFileName} onChange={(e) => setPresignFileName(e.target.value)} />
          </label>
          <label className="auth-field">
            <span>type</span>
            <select
              className="select"
              value={presignType}
              onChange={(e) => setPresignType(e.target.value as "image" | "video" | "voice")}
            >
              <option value="image">image</option>
              <option value="video">video</option>
              <option value="voice">voice</option>
            </select>
          </label>
          <button className="btn btn-outline" type="button" disabled={isWorking} onClick={() => void testPresign()}>
            Test presign endpoint
          </button>
          {presignResult ? (
            <div className="event-item">
              <div className="event-desc">{JSON.stringify(presignResult)}</div>
            </div>
          ) : (
            <div className="hint">
              Backend local mode hien tai se tra loi loi cho `/uploads/presign` (dung de verify endpoint).
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
