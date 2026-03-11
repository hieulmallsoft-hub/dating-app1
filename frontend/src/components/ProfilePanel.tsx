import { useEffect, useMemo, useState } from "react";
import * as authApi from "../api/auth";
import { getHttpMessage, getHttpStatus } from "../api/error";
import * as uploadsApi from "../api/uploads";
import * as userApi from "../api/user";

type Props = {
  onLogout: () => void;
  onAuthInvalid: () => void;
};

export default function ProfilePanel({ onLogout, onAuthInvalid }: Props) {
  const [me, setMe] = useState<userApi.UserMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<userApi.Gender | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [avatar, setAvatar] = useState("");

  const canSave = useMemo(() => !isSaving && !isUploadingAvatar, [isSaving, isUploadingAvatar]);

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const data = await userApi.getMe();
        setMe(data);
        setFullName(data.fullName || "");
        setGender(data.gender ?? "");
        setBirthDate(data.birthDate || "");
        setAvatar(data.avatar || "");
        setAvatarLoadError(false);
      } catch (err: unknown) {
        const status = getHttpStatus(err);
        if (status === 401) {
          onAuthInvalid();
        } else {
          setError(getHttpMessage(err, "Failed to load profile"));
        }
      }
    };
    void load();
  }, [onAuthInvalid]);

  const uploadAvatar = async (file: File) => {
    setIsUploadingAvatar(true);
    setError(null);
    setSuccess(null);
    try {
      const uploaded = await uploadsApi.uploadFile(file);
      if (uploaded.type !== "image") {
        setError("Avatar chi ho tro image");
        return;
      }
      setAvatar(uploaded.fileUrl);
      setAvatarLoadError(false);
      setSuccess("Da tai avatar. Bam Luu profile de cap nhat");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Upload avatar failed"));
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    void uploadAvatar(file);
  };

  const copyAccountCode = async () => {
    const accountCode = me?.accountCode?.trim();
    if (!accountCode) return;
    try {
      await navigator.clipboard.writeText(accountCode);
      setSuccess("Da copy account code");
    } catch {
      setError("Khong copy duoc account code");
    }
  };

  const save = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: userApi.UpdateMePayload = {
        fullName: fullName.trim() || undefined,
        gender: gender === "" ? undefined : gender,
        birthDate: birthDate || undefined,
        avatar: avatar.trim() || undefined,
      };

      const updated = await userApi.updateMe(payload);
      setMe(updated);
      setFullName(updated.fullName || "");
      setGender(updated.gender ?? "");
      setBirthDate(updated.birthDate || "");
      setAvatar(updated.avatar || "");
      setAvatarLoadError(false);
      setSuccess("Da luu profile");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Failed to save profile"));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const doLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      onLogout();
    }
  };

  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Tai khoan</h3>
        <p>Thong tin profile va account code</p>
      </div>

      {error ? <div className="panel-error">{error}</div> : null}
      {success ? <div className="panel-success">{success}</div> : null}

      <div className="profile-card">
        <div className="avatar large">
          {avatar && !avatarLoadError ? (
            <img
              src={avatar}
              alt="avatar"
              referrerPolicy="no-referrer"
              onLoad={() => setAvatarLoadError(false)}
              onError={() => setAvatarLoadError(true)}
            />
          ) : (
            <span>{(me?.email || "?").slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="profile-meta">
          <div className="profile-name">{me?.fullName || "No name"}</div>
          <div className="profile-sub">{me?.email || "-"}</div>
          <div className="profile-sub">Account code: {me?.accountCode || "------"}</div>
        </div>
      </div>

      <div className="join-row" style={{ marginBottom: 12 }}>
        <button className="btn btn-small btn-outline" onClick={() => void copyAccountCode()} disabled={!me?.accountCode} type="button">
          Copy account code
        </button>
      </div>

      {me?.latitude !== undefined || me?.longitude !== undefined ? (
        <div className="hint" style={{ marginBottom: 12 }}>
          Last location: {me?.latitude ?? "-"}, {me?.longitude ?? "-"}
        </div>
      ) : null}

      <div className="profile-form">
        <label className="auth-field">
          <span>Full name (toi da 15 ky tu)</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={15} />
        </label>

        <label className="auth-field">
          <span>Gender</span>
          <select
            value={gender === "" ? "" : String(gender)}
            onChange={(e) => {
              const value = e.target.value;
              setGender(value === "" ? "" : (Number(value) as userApi.Gender));
            }}
            className="select"
          >
            <option value="">-</option>
            <option value="0">0 - MALE</option>
            <option value="1">1 - FEMALE</option>
            <option value="2">2 - OTHER</option>
          </select>
        </label>

        <label className="auth-field">
          <span>Birth date</span>
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </label>

        <label className="auth-field">
          <span>Avatar URL</span>
          <input
            value={avatar}
            onChange={(e) => {
              setAvatar(e.target.value);
              setAvatarLoadError(false);
            }}
            placeholder="https://...jpg"
          />
          <div className="join-row" style={{ marginTop: 10 }}>
            <label className={`btn btn-small ${isUploadingAvatar ? "btn-outline" : "btn-primary"}`}>
              {isUploadingAvatar ? "Dang tai..." : "Upload avatar"}
              <input type="file" accept="image/*" onChange={onPickAvatar} hidden disabled={isUploadingAvatar} />
            </label>
            {avatar ? (
              <button
                className="btn btn-small"
                type="button"
                onClick={() => {
                  setAvatar("");
                  setAvatarLoadError(false);
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
          {avatar && avatarLoadError ? <div className="hint">Khong tai duoc anh avatar tu URL nay</div> : null}
        </label>

        <button className="btn btn-primary" onClick={() => void save()} disabled={!canSave} type="button">
          {isSaving ? "Dang luu..." : "Luu profile"}
        </button>
      </div>

      <button className="btn btn-outline" onClick={() => void doLogout()} type="button">
        Dang xuat
      </button>
    </div>
  );
}
