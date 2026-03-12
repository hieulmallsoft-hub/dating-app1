import React, { useEffect, useState } from "react";
import "./App.css";
import Home from "./components/Home";
import AuthScreen from "./components/AuthScreen";
import GoogleIdTokenLab from "./components/GoogleIdTokenLab";
import FirstTimeProfileSetup from "./components/FirstTimeProfileSetup";
import { getHttpStatus } from "./api/error";
import * as userApi from "./api/user";
import { clearTokens, hasAuthTokens, setTokens } from "./lib/authStorage";
import { syncPushTokenWithServer, unregisterPushTokenFromServer } from "./lib/pushNotifications";

type SessionStage = "logged_out" | "checking_profile" | "profile_check_failed" | "needs_profile" | "ready";

const App: React.FC = () => {
  const pathname = window.location.pathname.toLowerCase();
  if (pathname === "/google-idtoken-lab" || pathname === "/google-idtoken-lab/") {
    return <GoogleIdTokenLab />;
  }

  const [stage, setStage] = useState<SessionStage>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get("access_token");
    const refreshToken = urlParams.get("refresh_token");

    if (accessToken && refreshToken) {
      setTokens({ access_token: accessToken, refresh_token: refreshToken });
      return "checking_profile";
    }

    return hasAuthTokens() ? "checking_profile" : "logged_out";
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get("access_token");
    const refreshToken = urlParams.get("refresh_token");

    if (accessToken && refreshToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (stage !== "checking_profile") return;

    let cancelled = false;
    const checkProfile = async () => {
      try {
        const me = await userApi.getMe();
        const missingGender = me.gender === null || me.gender === undefined;
        const missingAvatar = !(me.avatar || "").trim();
        const missingBirthDate = !(me.birthDate || "").trim();

        if (!cancelled) {
          setStage(missingGender || missingAvatar || missingBirthDate ? "needs_profile" : "ready");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const status = getHttpStatus(err);
          if (status === 401) {
            clearTokens();
            setStage("logged_out");
          } else {
            setStage("profile_check_failed");
          }
        }
      }
    };

    void checkProfile();
    return () => {
      cancelled = true;
    };
  }, [stage]);

  const handleLogout = () => {
    void unregisterPushTokenFromServer();
    clearTokens();
    setStage("logged_out");
  };

  useEffect(() => {
    if (stage !== "ready") return;
    void syncPushTokenWithServer().catch((error) => {
      console.warn("Failed to sync push token", error);
    });
  }, [stage]);

  if (stage === "checking_profile") {
    return (
      <div className="screen">
        <div className="onboarding-card">
          <h2>Dang kiem tra profile...</h2>
          <p>Vui long doi trong giay lat</p>
        </div>
      </div>
    );
  }

  if (stage === "needs_profile") {
    return (
      <FirstTimeProfileSetup
        onCompleted={() => setStage("ready")}
        onLogout={handleLogout}
        onAuthInvalid={handleLogout}
      />
    );
  }

  if (stage === "profile_check_failed") {
    return (
      <div className="screen">
        <div className="onboarding-card">
          <h2>Khong kiem tra duoc profile</h2>
          <p>Token van duoc giu. Thu kiem tra lai hoac dang xuat dang nhap lai.</p>
          <div className="join-row">
            <button className="btn btn-primary" type="button" onClick={() => setStage("checking_profile")}>
              Thu lai
            </button>
            <button className="btn btn-outline" type="button" onClick={handleLogout}>
              Dang xuat
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "ready") {
    return <Home onLogout={handleLogout} onAuthInvalid={handleLogout} />;
  }

  return <AuthScreen onAuthSuccess={() => setStage("checking_profile")} />;
};

export default App;
