import { useCallback, useEffect, useMemo, useState } from "react";
import * as coupleApi from "../api/couple";
import { getHttpMessage, getHttpStatus } from "../api/error";
import * as userApi from "../api/user";

type Props = {
  onAuthInvalid: () => void;
};

function normalizeAccountCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

function isAccountCodeValid(value: string) {
  return /^[0-9]{6}$/.test(value);
}

export default function CouplePanel({ onAuthInvalid }: Props) {
  const [me, setMe] = useState<userApi.UserMe | null>(null);
  const [profile, setProfile] = useState<coupleApi.CoupleProfile | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [startDateDraft, setStartDateDraft] = useState("");
  const [savedStartDate, setSavedStartDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const normalizedJoinCode = useMemo(() => normalizeAccountCode(joinCode), [joinCode]);
  const canJoin = useMemo(
    () => isAccountCodeValid(normalizedJoinCode) && !isWorking,
    [normalizedJoinCode, isWorking]
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const meData = await userApi.getMe();
      setMe(meData);

      try {
        const coupleProfile = await coupleApi.getMyCouple();
        setProfile(coupleProfile);
      } catch (err: unknown) {
        const status = getHttpStatus(err);
        if (status === 404) {
          setProfile(null);
          setSavedStartDate("");
          setStartDateDraft("");
        } else if (status === 401) {
          onAuthInvalid();
        } else {
          setError(getHttpMessage(err, "Failed to load couple profile"));
        }
      }
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Failed to load account profile"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [onAuthInvalid]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const copyAccountCode = async () => {
    if (!me?.accountCode) return;
    try {
      await navigator.clipboard.writeText(me.accountCode);
      setSuccess("Da copy account code");
    } catch {
      setError("Khong copy duoc account code");
    }
  };

  const joinCouple = async () => {
    if (!canJoin) return;

    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      await coupleApi.joinCouple(normalizedJoinCode);
      setJoinCode("");
      await loadData();
      setSuccess("Da ghep doi");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Failed to join couple"));
      }
    } finally {
      setIsWorking(false);
    }
  };

  const saveStartDate = async () => {
    if (!profile) return;
    if (!startDateDraft.trim()) {
      setError("Nhap start date truoc khi cap nhat");
      return;
    }

    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await coupleApi.setStartDate(startDateDraft);
      const nextStartDate = updated.startDate || startDateDraft;
      setSavedStartDate(nextStartDate);
      setStartDateDraft(nextStartDate);
      await loadData();
      setSuccess("Da cap nhat ngay bat dau");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Failed to update start date"));
      }
    } finally {
      setIsWorking(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Ban chac chan muon ngat ket noi?")) return;

    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      await coupleApi.disconnectCouple();
      setSavedStartDate("");
      setStartDateDraft("");
      setJoinCode("");
      await loadData();
      setSuccess("Da ngat ket noi");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Failed to disconnect"));
      }
    } finally {
      setIsWorking(false);
    }
  };

  if (isLoading) {
    return <div className="panel">Dang tai...</div>;
  }

  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Couple</h3>
        <p>Ghep doi bang account code 6 chu so</p>
      </div>

      {error ? <div className="panel-error">{error}</div> : null}
      {success ? <div className="panel-success">{success}</div> : null}

      {profile && profile.status === "ACTIVE" ? (
        <div className="couple-card">
          <div className="couple-partner">
            <div className="avatar">
              <span>{(profile.fullName || profile.email || "?").slice(0, 1).toUpperCase()}</span>
            </div>
            <div className="partner-meta">
              <div className="partner-name">{profile.fullName || profile.email || "Partner"}</div>
              <div className="partner-sub">{profile.email || "-"}</div>
              <div className="partner-sub">Partner id: {profile.id || "-"}</div>
            </div>
          </div>

          <div className="hint">
            Vi tri:{" "}
            {profile.latitude !== null && profile.longitude !== null
              ? `${profile.latitude}, ${profile.longitude}`
              : "Chua co du lieu"}
          </div>

          <label className="auth-field">
            <span>Start date</span>
            <input type="date" value={startDateDraft} onChange={(e) => setStartDateDraft(e.target.value)} />
          </label>

          {savedStartDate ? (
            <div className="hint">Start date hien tai: {savedStartDate}</div>
          ) : (
            <div className="hint">API couple/profile hien chua tra ve startDate, nhap de cap nhat.</div>
          )}

          <div className="join-row">
            <button className="btn btn-primary" onClick={() => void saveStartDate()} disabled={isWorking} type="button">
              {isWorking ? "Dang xu ly..." : "Cap nhat start date"}
            </button>
            <button className="btn btn-outline" onClick={() => void disconnect()} disabled={isWorking} type="button">
              {isWorking ? "Dang xu ly..." : "Ngat ket noi"}
            </button>
          </div>
        </div>
      ) : (
        <div className="couple-actions">
          <div className="action-card">
            <div className="action-title">Account code cua ban</div>
            <div className="action-desc">Gui ma nay cho partner de ho ghep doi voi ban</div>

            <div className="invite-box">
              <div className="invite-code">{me?.accountCode || "------"}</div>
              <button className="btn btn-small" onClick={() => void copyAccountCode()} disabled={!me?.accountCode} type="button">
                Copy
              </button>
            </div>
          </div>

          <div className="action-card">
            <div className="action-title">Nhap account code partner</div>
            <div className="action-desc">Code gom 6 chu so</div>

            <div className="join-row">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(normalizeAccountCode(e.target.value))}
                placeholder="VD: 123456"
                className="join-input"
                maxLength={6}
              />
              <button className="btn btn-primary" onClick={() => void joinCouple()} disabled={!canJoin} type="button">
                Join
              </button>
            </div>
            {joinCode && !isAccountCodeValid(normalizedJoinCode) ? (
              <div className="hint">Account code phai dung 6 chu so</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
