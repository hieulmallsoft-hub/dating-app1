import { useCallback, useEffect, useMemo, useState } from "react";
import { getHttpMessage, getHttpStatus } from "../api/error";
import * as mediaApi from "../api/media";
import * as locationsApi from "../api/locations";
import * as securityApi from "../api/security";
import * as settingsApi from "../api/settings";
import * as uploadsApi from "../api/uploads";
import * as userApi from "../api/user";

type Props = {
  onAuthInvalid: () => void;
};

type OpsTab = "settings" | "security" | "locations" | "users" | "media" | "uploads";

const LOCATION_TYPES: locationsApi.LocationType[] = [
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

  const [locations, setLocations] = useState<locationsApi.LocationItem[]>([]);
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationLat, setLocationLat] = useState("");
  const [locationLng, setLocationLng] = useState("");
  const [locationRadius, setLocationRadius] = useState("200");
  const [locationType, setLocationType] = useState<locationsApi.LocationType>("OTHER");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<locationsApi.SearchLocationItem[]>([]);
  const [geofenceLocationId, setGeofenceLocationId] = useState("");
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

  const loadLocations = useCallback(async () => {
    try {
      const data = await locationsApi.getLocations();
      setLocations(data);
    } catch (err: unknown) {
      handleFailure(err, "Failed to load locations");
    }
  }, [handleFailure]);

  useEffect(() => {
    void loadSettings();
    void loadLocations();
  }, [loadLocations, loadSettings]);

  const locationCount = useMemo(() => locations.filter((item) => !item.isDeleted).length, [locations]);

  const createLocation = async () => {
    await runAction(async () => {
      try {
        const created = await locationsApi.createLocation({
          name: locationName.trim(),
          address: locationAddress.trim() || undefined,
          latitude: locationLat.trim() ? Number(locationLat) : undefined,
          longitude: locationLng.trim() ? Number(locationLng) : undefined,
          locationType,
          radius: Number(locationRadius) || 200,
        });
        setLocations((prev) => [created, ...prev]);
        setLocationName("");
        setLocationAddress("");
        setLocationLat("");
        setLocationLng("");
        setLocationRadius("200");
        setSuccess("Da tao location");
      } catch (err: unknown) {
        handleFailure(err, "Create location failed");
      }
    });
  };

  const updateLocationQuick = async (location: locationsApi.LocationItem) => {
    const nextName = window.prompt("Location name", location.name);
    if (nextName === null) return;
    const nextAddress = window.prompt("Address", location.address || "");
    if (nextAddress === null) return;
    await runAction(async () => {
      try {
        const updated = await locationsApi.updateLocation(location.id, {
          name: nextName.trim() || location.name,
          address: nextAddress.trim() || undefined,
        });
        setLocations((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setSuccess("Da cap nhat location");
      } catch (err: unknown) {
        handleFailure(err, "Update location failed");
      }
    });
  };

  const deleteLocation = async (id: string) => {
    if (!window.confirm("Xoa location nay?")) return;
    await runAction(async () => {
      try {
        await locationsApi.deleteLocation(id);
        await loadLocations();
        setSuccess("Da xoa location");
      } catch (err: unknown) {
        handleFailure(err, "Delete location failed");
      }
    });
  };

  const searchLocation = async () => {
    if (searchQuery.trim().length < 2) {
      setError("Nhap it nhat 2 ky tu de search");
      return;
    }
    await runAction(async () => {
      try {
        const data = await locationsApi.searchLocations(searchQuery.trim());
        setSearchResults(data);
        setSuccess(`Tim thay ${data.length} ket qua`);
      } catch (err: unknown) {
        handleFailure(err, "Search location failed");
      }
    });
  };

  const sendGeofence = async () => {
    if (!geofenceLocationId.trim()) {
      setError("Nhap locationId de test geofence");
      return;
    }
    await runAction(async () => {
      try {
        await locationsApi.sendGeofenceEvent({
          locationId: geofenceLocationId.trim(),
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
        <button className={`location-tab-btn ${tab === "locations" ? "active" : ""}`} type="button" onClick={() => setTab("locations")}>
          Locations
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

      {tab === "locations" ? (
        <div className="events-form">
          <div className="hint">Locations active: {locationCount}</div>
          <label className="auth-field">
            <span>Search location</span>
            <div className="join-row">
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="VD: cafe district 1" className="join-input" />
              <button className="btn btn-small" type="button" disabled={isWorking} onClick={() => void searchLocation()}>
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
                    {item.latitude ?? "-"}, {item.longitude ?? "-"} | {item.locationType}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <label className="auth-field">
            <span>New location name</span>
            <input value={locationName} onChange={(e) => setLocationName(e.target.value)} />
          </label>
          <label className="auth-field">
            <span>Address</span>
            <input value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} />
          </label>
          <div className="grid-2">
            <label className="auth-field">
              <span>Latitude</span>
              <input value={locationLat} onChange={(e) => setLocationLat(e.target.value)} />
            </label>
            <label className="auth-field">
              <span>Longitude</span>
              <input value={locationLng} onChange={(e) => setLocationLng(e.target.value)} />
            </label>
          </div>
          <div className="grid-2">
            <label className="auth-field">
              <span>Radius</span>
              <input value={locationRadius} onChange={(e) => setLocationRadius(e.target.value)} />
            </label>
            <label className="auth-field">
              <span>Type</span>
              <select
                className="select"
                value={locationType}
                onChange={(e) => setLocationType(e.target.value as locationsApi.LocationType)}
              >
                {LOCATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="btn btn-primary" type="button" disabled={isWorking} onClick={() => void createLocation()}>
            Create location
          </button>
          <button className="btn btn-outline" type="button" disabled={isWorking} onClick={() => void loadLocations()}>
            Reload locations
          </button>

          <label className="auth-field">
            <span>Geofence test locationId</span>
            <input value={geofenceLocationId} onChange={(e) => setGeofenceLocationId(e.target.value)} />
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

          {locations.length ? (
            <div className="events-list">
              {locations.slice(0, 20).map((location) => (
                <div className="event-item" key={location.id}>
                  <div className="event-head">
                    <div className="event-title">{location.name}</div>
                    <span className="event-badge">{location.locationType}</span>
                  </div>
                  <div className="event-desc">{location.id}</div>
                  <div className="event-actions">
                    <button className="btn btn-small" type="button" disabled={isWorking} onClick={() => void updateLocationQuick(location)}>
                      Edit
                    </button>
                    <button className="btn btn-small" type="button" disabled={isWorking} onClick={() => void deleteLocation(location.id)}>
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
