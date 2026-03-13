import { useMemo, useRef, useState } from "react";
import { BACKEND_URL } from "../api/http";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdentityApi = {
  accounts?: {
    id?: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: Record<string, string | number | boolean>
      ) => void;
      prompt: () => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_SCRIPT_ID = "google-identity-services";

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleScript() {
  if (typeof window !== "undefined" && window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(
      GOOGLE_SCRIPT_ID
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google script")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

function parseJsonSafely(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export default function GoogleIdTokenLab() {
  const envClientId = useMemo(
    () => String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim(),
    []
  );
  const [clientId, setClientId] = useState(envClientId);
  const [idToken, setIdToken] = useState("");
  const [fcmToken, setFcmToken] = useState("");
  const [statusText, setStatusText] = useState("");
  const [statusError, setStatusError] = useState(false);
  const [apiResponse, setApiResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const buttonRef = useRef<HTMLDivElement | null>(null);

  const setStatus = (text: string, isError = false) => {
    setStatusText(text);
    setStatusError(isError);
  };

  const initGoogle = async () => {
    const normalizedClientId = clientId.trim();
    if (!normalizedClientId) {
      setStatus("Google Client ID is required", true);
      return;
    }

    try {
      await loadGoogleScript();
      const googleApi = window.google?.accounts?.id;
      if (!googleApi || !buttonRef.current) {
        setStatus("Google Identity API is unavailable", true);
        return;
      }

      buttonRef.current.innerHTML = "";
      googleApi.initialize({
        client_id: normalizedClientId,
        callback: (response) => {
          if (!response?.credential) {
            setStatus("Google did not return credential", true);
            return;
          }
          setIdToken(response.credential);
          setStatus("ID token generated successfully");
        },
      });
      googleApi.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: 280,
      });
      googleApi.prompt();
      setStatus("Google login button initialized");
    } catch (error) {
      setStatus((error as Error)?.message || "Failed to initialize Google", true);
    }
  };

  const copyIdToken = async () => {
    if (!idToken) {
      setStatus("No ID token to copy", true);
      return;
    }
    try {
      await navigator.clipboard.writeText(idToken);
      setStatus("Copied ID token");
    } catch {
      setStatus("Clipboard copy failed, copy manually", true);
    }
  };

  const sendToBackend = async () => {
    if (!idToken.trim()) {
      setStatus("No ID token provided", true);
      return;
    }
    if (!fcmToken.trim()) {
      setStatus("No FCM token provided", true);
      return;
    }

    setSubmitting(true);
    setApiResponse("Sending request...");
    setStatus("");

    try {
      const res = await fetch(`${BACKEND_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: idToken.trim(), fcmToken: fcmToken.trim(), platform: "web" }),
        credentials: "include",
      });
      const text = await res.text();
      const parsed = parseJsonSafely(text);
      setApiResponse(JSON.stringify({ status: res.status, data: parsed }, null, 2));

      if (res.ok) {
        setStatus("POST /auth/google success");
      } else {
        setStatus("Backend returned an error, check response below", true);
      }
    } catch (error) {
      setStatus("Cannot call backend", true);
      setApiResponse(String(error));
    } finally {
      setSubmitting(false);
    }
  };

  const clearAll = () => {
    setIdToken("");
    setFcmToken("");
    setApiResponse("");
    setStatus("");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#f8fafc,#eef2f7)",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          background: "#fff",
          border: "1px solid #dbe2ea",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
          fontFamily: "Segoe UI, Tahoma, sans-serif",
        }}
      >
        <h1 style={{ marginTop: 0 }}>Google ID Token Lab (React)</h1>
        <p style={{ color: "#475569", lineHeight: 1.4 }}>
          This page helps you generate a real Google ID token for testing{" "}
          <code>POST /auth/google</code> in Swagger/Postman.
        </p>

        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          Google Client ID
        </label>
        <input
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="xxxxxxxxxx-xxxx.apps.googleusercontent.com"
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid #dbe2ea",
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 12,
          }}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <button
            type="button"
            onClick={initGoogle}
            style={{
              background: "#0ea5e9",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "10px 14px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Initialize Google Sign-In
          </button>
          <button
            type="button"
            onClick={copyIdToken}
            style={{
              background: "#334155",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "10px 14px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Copy ID Token
          </button>
          <button
            type="button"
            onClick={clearAll}
            style={{
              background: "#dc2626",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "10px 14px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Clear
          </button>
        </div>

        <div ref={buttonRef} style={{ minHeight: 44, marginBottom: 14 }} />

        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          ID Token
        </label>
        <textarea
          value={idToken}
          onChange={(e) => setIdToken(e.target.value)}
          placeholder="ID token appears here..."
          style={{
            width: "100%",
            minHeight: 110,
            boxSizing: "border-box",
            border: "1px solid #dbe2ea",
            borderRadius: 8,
            padding: "10px 12px",
            fontFamily: "Consolas, Courier New, monospace",
            resize: "vertical",
            marginBottom: 12,
          }}
        />

        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          FCM Token
        </label>
        <textarea
          value={fcmToken}
          onChange={(e) => setFcmToken(e.target.value)}
          placeholder="Paste device FCM token..."
          style={{
            width: "100%",
            minHeight: 90,
            boxSizing: "border-box",
            border: "1px solid #dbe2ea",
            borderRadius: 8,
            padding: "10px 12px",
            fontFamily: "Consolas, Courier New, monospace",
            resize: "vertical",
            marginBottom: 12,
          }}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <button
            type="button"
            onClick={sendToBackend}
            disabled={submitting}
            style={{
              background: "#0ea5e9",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "10px 14px",
              cursor: "pointer",
              fontWeight: 600,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Sending..." : `Send to ${BACKEND_URL}/auth/google`}
          </button>
        </div>

        {statusText ? (
          <p style={{ color: statusError ? "#b91c1c" : "#166534", fontWeight: 600 }}>
            {statusText}
          </p>
        ) : null}

        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          Backend Response
        </label>
        <textarea
          value={apiResponse}
          readOnly
          style={{
            width: "100%",
            minHeight: 140,
            boxSizing: "border-box",
            border: "1px solid #dbe2ea",
            borderRadius: 8,
            padding: "10px 12px",
            fontFamily: "Consolas, Courier New, monospace",
            resize: "vertical",
          }}
        />

        <p style={{ color: "#475569", marginTop: 14 }}>
          Tip: set <code>VITE_GOOGLE_CLIENT_ID</code> in{" "}
          <code>frontend/.env</code> to auto-fill the client ID.
        </p>
      </div>
    </div>
  );
}
