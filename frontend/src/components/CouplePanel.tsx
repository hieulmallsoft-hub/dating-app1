import { useCallback, useEffect, useMemo, useState } from "react";
import * as coupleApi from "../api/couple";
import { getHttpMessage, getHttpStatus } from "../api/error";

type Props = {
  onAuthInvalid: () => void;
};

function normalizeInviteCode(value: string) {
  return value.trim().toUpperCase();
}

function isInviteCodeValid(value: string) {
  return /^[A-F0-9]{8}$/.test(value);
}

export default function CouplePanel({ onAuthInvalid }: Props) {
  const [couple, setCouple] = useState<coupleApi.Couple | null>(null);
  const [invite, setInvite] = useState<coupleApi.Invite | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [reconnectCode, setReconnectCode] = useState("");
  const [startDateDraft, setStartDateDraft] = useState("");
  const [themeDraft, setThemeDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const partner = couple?.partner ?? null;
  const normalizedJoinCode = useMemo(() => normalizeInviteCode(joinCode), [joinCode]);
  const canJoin = useMemo(() => isInviteCodeValid(normalizedJoinCode) && !isWorking, [normalizedJoinCode, isWorking]);

  const loadCouple = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await coupleApi.getMyCouple();
      setCouple(data);
      setStartDateDraft(data.startDate || "");
      setThemeDraft(data.theme || "");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 404) {
        setCouple(null);
      } else if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Failed to load couple"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [onAuthInvalid]);

  useEffect(() => {
    void loadCouple();
  }, [loadCouple]);

  const createInvite = async () => {
    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await coupleApi.createInvite();
      setInvite(data);
      setSuccess("Da tao invite");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Failed to create invite"));
      }
    } finally {
      setIsWorking(false);
    }
  };

  const joinCouple = async () => {
    if (!canJoin) return;
    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      await coupleApi.joinCouple(normalizedJoinCode);
      setInvite(null);
      setJoinCode("");
      await loadCouple();
      setSuccess("Da ghep doi");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Failed to join"));
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
      setInvite(null);
      setJoinCode("");
      setReconnectCode("");
      await loadCouple();
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

  const copyInvite = async () => {
    if (!invite?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(invite.inviteCode);
    } catch {
      // ignore
    }
  };

  const normalizedReconnectCode = useMemo(
    () => normalizeInviteCode(reconnectCode),
    [reconnectCode]
  );
  const canReconnect = useMemo(
    () => isInviteCodeValid(normalizedReconnectCode) && !isWorking,
    [normalizedReconnectCode, isWorking]
  );

  const connectNew = async () => {
    if (!canReconnect) return;
    if (
      !window.confirm(
        "Ket noi moi se tu dong ngat ket noi hien tai. Ban chac chan?"
      )
    ) {
      return;
    }

    setIsWorking(true);
    setError(null);
    setSuccess(null);
    try {
      await coupleApi.connectNew(normalizedReconnectCode);
      setInvite(null);
      setReconnectCode("");
      await loadCouple();
      setSuccess("Da ket noi moi");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Failed to connect new"));
      }
    } finally {
      setIsWorking(false);
    }
  };

  const saveCouple = async () => {
    if (!couple) return;
    setIsWorking(true);
    setError(null);
    setSuccess(null);

    try {
      const ops: Promise<unknown>[] = [];
      if (startDateDraft !== (couple.startDate || "")) {
        ops.push(coupleApi.setStartDate(startDateDraft));
      }
      if (themeDraft.trim() !== (couple.theme || "")) {
        ops.push(coupleApi.setTheme(themeDraft.trim()));
      }

      if (!ops.length) {
        setSuccess("Khong co thay doi");
        return;
      }

      await Promise.all(ops);
      await loadCouple();
      setSuccess("Da cap nhat");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Failed to update couple"));
      }
    } finally {
      setIsWorking(false);
    }
  };

  if (isLoading) {
    return <div className="panel">Loading...</div>;
  }

  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Ghep doi</h3>
        <p>Invite code de ket noi voi nguoi yeu</p>
      </div>

      {error ? <div className="panel-error">{error}</div> : null}
      {success ? <div className="panel-success">{success}</div> : null}

      {couple && couple.status === "ACTIVE" && partner ? (
        <div className="couple-card">
          <div className="couple-partner">
            <div className="avatar">
              {partner.avatar ? (
                <img src={partner.avatar} alt="partner" />
              ) : (
                <span>{(partner.fullName || partner.email || "?").slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="partner-meta">
              <div className="partner-name">{partner.fullName || partner.email}</div>
              <div className="partner-sub">{partner.email}</div>
            </div>
          </div>

          <div className="couple-meta">
            <label className="auth-field">
              <span>Start date</span>
              <input
                type="date"
                value={startDateDraft}
                onChange={(e) => setStartDateDraft(e.target.value)}
              />
            </label>
            <label className="auth-field">
              <span>Theme</span>
              <input
                value={themeDraft}
                onChange={(e) => setThemeDraft(e.target.value)}
                placeholder="VD: pastel"
              />
            </label>
          </div>

          <button
            className="btn btn-primary"
            onClick={saveCouple}
            disabled={isWorking}
            type="button"
          >
            {isWorking ? "Dang xu ly..." : "Cap nhat"}
          </button>

          <div className="divider" />

          <div className="action-card">
            <div className="action-title">Ket noi moi</div>
            <div className="action-desc">Nhap code moi de doi partner (tu dong ngat ket noi cu)</div>
            <div className="join-row">
              <input
                value={reconnectCode}
                onChange={(e) => setReconnectCode(e.target.value)}
                placeholder="VD: 401CC2F1"
                className="join-input"
              />
              <button
                className="btn btn-primary"
                onClick={connectNew}
                disabled={!canReconnect}
                type="button"
              >
                Connect
              </button>
            </div>
            {!reconnectCode ? null : !isInviteCodeValid(normalizedReconnectCode) ? (
              <div className="hint">Code phai dung 8 ky tu hex</div>
            ) : null}
          </div>

          <button className="btn btn-outline" onClick={disconnect} disabled={isWorking} type="button">
            {isWorking ? "Dang xu ly..." : "Ngat ket noi"}
          </button>
        </div>
      ) : (
        <>
          <div className="couple-actions">
            <div className="action-card">
              <div className="action-title">Tao ma moi</div>
              <div className="action-desc">Gui code nay cho nguoi kia de ghep doi</div>

              {invite ? (
                <div className="invite-box">
                  <div className="invite-code">{invite.inviteCode}</div>
                  <button className="btn btn-small" onClick={copyInvite} type="button">
                    Copy
                  </button>
                </div>
              ) : null}

              <button className="btn btn-primary" onClick={createInvite} disabled={isWorking} type="button">
                {isWorking ? "Dang tao..." : "Tao invite"}
              </button>
            </div>

            <div className="action-card">
              <div className="action-title">Nhap code</div>
              <div className="action-desc">Nhap code 8 ky tu (A-F, 0-9)</div>

              <div className="join-row">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="VD: 401CC2F1"
                  className="join-input"
                />
                <button className="btn btn-primary" onClick={joinCouple} disabled={!canJoin} type="button">
                  Join
                </button>
              </div>
              {!joinCode ? null : !isInviteCodeValid(normalizedJoinCode) ? (
                <div className="hint">Code phai dung 8 ky tu hex</div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
