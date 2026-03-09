import React, { useEffect, useState } from "react";
import "./App.css";
import Home from "./components/Home";
import AuthScreen from "./components/AuthScreen";
import GoogleIdTokenLab from "./components/GoogleIdTokenLab";
import { clearTokens, hasAuthTokens, setTokens } from "./lib/authStorage";

const App: React.FC = () => {
  const pathname = window.location.pathname.toLowerCase();
  if (pathname === "/google-idtoken-lab" || pathname === "/google-idtoken-lab/") {
    return <GoogleIdTokenLab />;
  }

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get("access_token");
    const refreshToken = urlParams.get("refresh_token");

    if (accessToken && refreshToken) {
      setTokens({ access_token: accessToken, refresh_token: refreshToken });
      return true;
    }

    return hasAuthTokens();
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get("access_token");
    const refreshToken = urlParams.get("refresh_token");

    if (accessToken && refreshToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogout = () => {
    clearTokens();
    setIsLoggedIn(false);
  };

  if (isLoggedIn) {
    return <Home onLogout={handleLogout} onAuthInvalid={handleLogout} />;
  }

  return <AuthScreen onAuthSuccess={() => setIsLoggedIn(true)} />;
};

export default App;
