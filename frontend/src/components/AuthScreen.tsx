import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Heart } from "lucide-react";
import * as authApi from "../api/auth";
import { getHttpMessage } from "../api/error";
import { BACKEND_URL } from "../api/http";
import { setTokens } from "../lib/authStorage";

type Props = {
  onAuthSuccess: () => void;
};

type AuthMode = "login" | "register";

export default function AuthScreen({ onAuthSuccess }: Props) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return !isSubmitting && email.trim().length > 0 && password.trim().length >= 6;
  }, [email, isSubmitting, password]);

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/auth/google`;
  };

  const handleLocalAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();
      const normalizedFullName = fullName.trim();

      const result =
        mode === "register"
          ? await authApi.localRegister({
              email: normalizedEmail,
              password: normalizedPassword,
              fullName: normalizedFullName || undefined
            })
          : await authApi.localLogin({
              email: normalizedEmail,
              password: normalizedPassword
            });

      setTokens(result.tokens);
      onAuthSuccess();
    } catch (err: unknown) {
      setError(
        getHttpMessage(
          err,
          mode === "register" ? "Khong tao duoc tai khoan test" : "Dang nhap that bai"
        )
      );
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
      <p>Dang nhap test nhanh bang email/password hoac Google</p>

      <div className="auth-tabs">
        <button
          className={`auth-tab ${mode === "login" ? "active" : ""}`}
          type="button"
          onClick={() => setMode("login")}
        >
          Dang nhap test
        </button>
        <button
          className={`auth-tab ${mode === "register" ? "active" : ""}`}
          type="button"
          onClick={() => setMode("register")}
        >
          Dang ky test
        </button>
      </div>

      <form className="auth-form" onSubmit={handleLocalAuth}>
        {mode === "register" ? (
          <label className="auth-field">
            <span>Full name (optional)</span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              maxLength={80}
              autoComplete="name"
              placeholder="Test User"
            />
          </label>
        ) : null}

        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="test.user@example.com"
          />
        </label>

        <label className="auth-field">
          <span>Password (toi thieu 6 ky tu)</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            placeholder="123456"
          />
        </label>

        {error ? <div className="auth-error">{error}</div> : null}

        <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
          {isSubmitting
            ? "Dang xu ly..."
            : mode === "register"
              ? "Tao tai khoan test"
              : "Dang nhap test"}
        </button>
      </form>

      <div className="auth-divider">Hoac</div>

      <div className="button-group" style={{ maxWidth: 360 }}>
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
