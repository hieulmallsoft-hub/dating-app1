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
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<userApi.Gender | "">("");
  const [genderPreference, setGenderPreference] = useState<userApi.GenderPreference | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [avatar, setAvatar] = useState("");
  const [bio, setBio] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [school, setSchool] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoDraft, setPhotoDraft] = useState("");

  const canSave = useMemo(
    () => !isSaving && !isUploadingAvatar && !isUploadingPhoto,
    [isSaving, isUploadingAvatar, isUploadingPhoto]
  );

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const data = await userApi.getMe();
        setMe(data);
        setFullName(data.fullName || "");
        setGender(data.gender || "");
        setGenderPreference(data.genderPreference || "");
        setBirthDate(data.birthDate || "");
        setAvatar(data.avatar || "");
        setAvatarLoadError(false);
        setBio(data.bio || "");
        setJobTitle(data.jobTitle || "");
        setCompany(data.company || "");
        setSchool(data.school || "");
        setPhotos(Array.isArray(data.photos) ? data.photos : []);
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

  const addPhoto = () => {
    const value = photoDraft.trim();
    if (!value) return;
    if (photos.includes(value)) {
      setPhotoDraft("");
      return;
    }
    setPhotos((prev) => [...prev, value]);
    setPhotoDraft("");
  };

  const removePhoto = (url: string) => {
    setPhotos((prev) => prev.filter((p) => p !== url));
  };

  const uploadAvatar = async (file: File) => {
    setIsUploadingAvatar(true);
    setError(null);
    setSuccess(null);
    try {
      const uploaded = await uploadsApi.uploadFile(file);
      if (uploaded.type !== "image") {
        setError("Avatar chi ho tro anh (image)");
        return;
      }
      setAvatar(uploaded.fileUrl);
      setAvatarLoadError(false);
      setSuccess("Da tai len avatar. Bam Luu profile de cap nhat");
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

  const uploadPhoto = async (file: File) => {
    setIsUploadingPhoto(true);
    setError(null);
    setSuccess(null);
    try {
      const uploaded = await uploadsApi.uploadFile(file);
      if (uploaded.type !== "image") {
        setError("Photos chi ho tro anh (image)");
        return;
      }
      setPhotos((prev) => (prev.includes(uploaded.fileUrl) ? prev : [...prev, uploaded.fileUrl]));
      setSuccess("Da tai len photo. Bam Luu profile de cap nhat");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Upload photo failed"));
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    void uploadPhoto(file);
  };

  const save = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: userApi.UpdateMePayload = {
        fullName: fullName.trim() || undefined,
        gender: gender || undefined,
        genderPreference: genderPreference || undefined,
        birthDate: birthDate || undefined,
        avatar: avatar.trim() || undefined,
        bio: bio.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        company: company.trim() || undefined,
        school: school.trim() || undefined,
        photos: photos.length ? photos : undefined,
      };

      const updated = await userApi.updateMe(payload);
      setMe(updated);
      setSuccess("Da luu");
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
        <p>Cap nhat thong tin ca nhan</p>
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
        </div>
      </div>

      <div className="profile-form">
        <label className="auth-field">
          <span>Full name (toi da 15 ky tu)</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={15} />
        </label>

        <label className="auth-field">
          <span>Gender</span>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as userApi.Gender | "")}
            className="select"
          >
            <option value="">-</option>
            <option value="MALE">MALE</option>
            <option value="FEMALE">FEMALE</option>
            <option value="OTHER">OTHER</option>
          </select>
        </label>

        <label className="auth-field">
          <span>Gender preference</span>
          <select
            value={genderPreference}
            onChange={(e) =>
              setGenderPreference(e.target.value as userApi.GenderPreference | "")
            }
            className="select"
          >
            <option value="">-</option>
            <option value="MALE">MALE</option>
            <option value="FEMALE">FEMALE</option>
            <option value="BOTH">BOTH</option>
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
          {avatar && avatarLoadError ? (
            <div className="hint">
              Khong tai duoc anh. Link ban nhap co the la link bai viet, khong phai link anh truc tiep, hoac website chan hotlink. Hay dung link
              ket thuc .jpg/.png/.webp (hoac Copy image address).
            </div>
          ) : null}
        </label>

        <label className="auth-field">
          <span>Bio</span>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="textarea" rows={3} />
        </label>

        <div className="grid-2">
          <label className="auth-field">
            <span>Job title</span>
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </label>
          <label className="auth-field">
            <span>Company</span>
            <input value={company} onChange={(e) => setCompany(e.target.value)} />
          </label>
        </div>

        <label className="auth-field">
          <span>School</span>
          <input value={school} onChange={(e) => setSchool(e.target.value)} />
        </label>

        <div className="photos">
          <div className="photos-head">
            <div className="photos-title">Photos (URL)</div>
            <div className="photos-sub">Them nhieu anh bang URL</div>
          </div>
          <div className="join-row">
            <input
              value={photoDraft}
              onChange={(e) => setPhotoDraft(e.target.value)}
              placeholder="https://..."
              className="join-input"
            />
            <button className="btn btn-small" onClick={addPhoto} type="button">
              Add
            </button>
          </div>
          <div className="join-row" style={{ marginTop: 10 }}>
            <label className={`btn btn-small ${isUploadingPhoto ? "btn-outline" : "btn-primary"}`}>
              {isUploadingPhoto ? "Dang tai..." : "Upload photo"}
              <input type="file" accept="image/*" onChange={onPickPhoto} hidden disabled={isUploadingPhoto} />
            </label>
          </div>
          {photos.length ? (
            <div className="photos-list">
              {photos.map((url) => (
                <div className="photo-row" key={url}>
                  <span className="photo-url">{url}</span>
                  <button className="btn btn-small" onClick={() => removePhoto(url)} type="button">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="hint">Chua co photo nao</div>
          )}
        </div>

        <button className="btn btn-primary" onClick={save} disabled={!canSave} type="button">
          {isSaving ? "Dang luu..." : "Luu profile"}
        </button>
      </div>

      <button className="btn btn-outline" onClick={doLogout} type="button">
        Dang xuat
      </button>
    </div>
  );
}
