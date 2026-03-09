import { useEffect, useMemo, useState } from "react";
import * as authApi from "../api/auth";
import { getHttpMessage, getHttpStatus } from "../api/error";
import * as userApi from "../api/user";

type Props = {
  onCompleted: () => void;
  onLogout: () => void;
  onAuthInvalid: () => void;
};

export default function FirstTimeProfileSetup({ onCompleted, onLogout, onAuthInvalid }: Props) {
  const [gender, setGender] = useState<userApi.Gender | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [avatar, setAvatar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const canSave = useMemo(() => {
    return !isLoading && !isSaving && gender !== "" && birthDate.trim().length > 0 && avatar.trim().length > 0;
  }, [isLoading, isSaving, gender, birthDate, avatar]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const me = await userApi.getMe();
        setGender(me.gender ?? "");
        setBirthDate((me.birthDate || "").slice(0, 10));
        setAvatar(me.avatar || "");
        setPreviewError(false);
      } catch (err: unknown) {
        const status = getHttpStatus(err);
        if (status === 401) {
          onAuthInvalid();
          return;
        }
        setError(getHttpMessage(err, "Khong tai duoc profile"));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [onAuthInvalid]);

  const save = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setError(null);
    try {
      await userApi.updateMe({
        gender: gender === "" ? undefined : gender,
        birthDate: birthDate.trim() || undefined,
        avatar: avatar.trim() || undefined
      });
      onCompleted();
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Khong luu duoc profile"));
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
    <div className="screen onboarding-screen">
      <div className="onboarding-card">
        <h2>Hoan thien profile lan dau</h2>
        <p>Vui long chon gioi tinh, ngay sinh va nhap link avatar de tiep tuc vao trang chu</p>

        {error ? <div className="panel-error">{error}</div> : null}

        <div className="profile-form">
          <label className="auth-field">
            <span>Gioi tinh</span>
            <select
              value={gender === "" ? "" : String(gender)}
              onChange={(e) => {
                const value = e.target.value;
                setGender(value === "" ? "" : (Number(value) as userApi.Gender));
              }}
              className="select"
              disabled={isLoading || isSaving}
            >
              <option value="">Chon gioi tinh</option>
              <option value="0">0 - MALE</option>
              <option value="1">1 - FEMALE</option>
              <option value="2">2 - OTHER</option>
            </select>
          </label>

          <label className="auth-field">
            <span>Ngay sinh</span>
            <input
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              type="date"
              max="2099-12-31"
              disabled={isLoading || isSaving}
            />
          </label>

          <label className="auth-field">
            <span>Link avatar</span>
            <input
              value={avatar}
              onChange={(e) => {
                setAvatar(e.target.value);
                setPreviewError(false);
              }}
              placeholder="https://...jpg"
              disabled={isLoading || isSaving}
            />
          </label>

          {avatar.trim() ? (
            <div className="onboarding-preview">
              {!previewError ? (
                <img
                  src={avatar.trim()}
                  alt="avatar-preview"
                  onError={() => setPreviewError(true)}
                />
              ) : (
                <div className="hint">Link avatar khong hop le hoac anh khong truy cap duoc</div>
              )}
            </div>
          ) : null}

          <button className="btn btn-primary" onClick={save} disabled={!canSave} type="button">
            {isSaving ? "Dang luu..." : "Luu va vao trang chu"}
          </button>

          <button className="btn btn-outline" onClick={doLogout} disabled={isSaving} type="button">
            Dang xuat
          </button>
        </div>
      </div>
    </div>
  );
}
