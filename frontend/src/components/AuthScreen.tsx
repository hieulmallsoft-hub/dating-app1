import React, { useMemo, useState } from "react";
import { Apple, Heart } from "lucide-react";
import { BACKEND_URL } from "../api/http";
import * as authApi from "../api/auth";
import { getHttpMessage } from "../api/error";
import { setTokens } from "../lib/authStorage";

type Props = {
  onAuthSuccess: () => void;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export default function AuthScreen({ onAuthSuccess }: Props) {
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER" | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [avatar, setAvatar] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const emailOk = normalizeEmail(email).length > 0;
    if (mode === "login") {
      return emailOk && password.length >= 6 && !isSubmitting;
    }
    return emailOk && gender.length > 0 && birthDate.trim().length > 0 && !isSubmitting;
  }, [email, password, mode, gender, birthDate, isSubmitting]);

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/auth/google`;
  };

  const handleAppleLogin = () => {
    window.location.href = `${BACKEND_URL}/auth/apple`;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const payloadEmail = normalizeEmail(email);
      const result =
        mode === "login"
          ? await authApi.login({ email: payloadEmail, password })
          : await authApi.register({
              email: payloadEmail,
              fullName: fullName.trim() || undefined,
              gender: gender as "MALE" | "FEMALE" | "OTHER",
              birthDate: birthDate.trim(),
              avatar: avatar.trim() || undefined
            });

      setTokens(result.tokens);
      onAuthSuccess();
    } catch (err: unknown) {
      setError(getHttpMessage(err, "Request failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="screen">
      <div className="mascot-container">
        <Heart size={120} color="#FF4D80" fill="#FF4D80" />
      </div>

      <h1>Fozi</h1>
      <p>
        {mode === "login" ? "Dang nhap de tiep tuc" : "Tao tai khoan moi"}
      </p>

      <div className="auth-tabs">
        <button
          className={`auth-tab ${mode === "login" ? "active" : ""}`}
          onClick={() => setMode("login")}
          type="button"
        >
          Dang nhap
        </button>
        <button
          className={`auth-tab ${mode === "register" ? "active" : ""}`}
          onClick={() => setMode("register")}
          type="button"
        >
          Dang ky
        </button>
      </div>

      <form className="auth-form" onSubmit={submit}>
        {mode === "register" ? (
          <>
            <label className="auth-field">
              <span>Ho ten (tuy chon)</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyen Van A"
                autoComplete="name"
              />
            </label>
            <label className="auth-field">
              <span>Gioi tinh</span>
              <select
                className="select"
                value={gender}
                onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE" | "OTHER" | "")}
              >
                <option value="">Chon gioi tinh</option>
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
                <option value="OTHER">OTHER</option>
              </select>
            </label>
            <label className="auth-field">
              <span>Ngay sinh</span>
              <input
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                type="date"
                max="2099-12-31"
              />
            </label>
            <label className="auth-field">
              <span>Avatar URL (tuy chon)</span>
              <input
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://cdn.example.com/avatar.jpg"
                inputMode="url"
              />
            </label>
          </>
        ) : null}

        <label className="auth-field">
          <span>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
          />
        </label>

        {mode === "login" ? (
          <label className="auth-field">
            <span>Mat khau</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Toi thieu 6 ky tu"
              autoComplete="current-password"
              type="password"
            />
          </label>
        ) : null}

        {error ? <div className="auth-error">{error}</div> : null}

        <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
          {isSubmitting
            ? "Dang xu ly..."
            : mode === "login"
              ? "Dang nhap"
              : "Dang ky"}
        </button>
      </form>

      <div className="auth-divider">
        <span>Hoac</span>
      </div>

      <div className="button-group" style={{ maxWidth: 360 }}>
        <button className="btn btn-apple" onClick={handleAppleLogin} type="button">
          <Apple className="btn-icon" />
          Tiep tuc voi Apple
        </button>

        <button className="btn btn-google" onClick={handleGoogleLogin} type="button">
          <svg className="btn-icon" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Tiep tuc voi Google
        </button>
      </div>
    </div>
  );
}
