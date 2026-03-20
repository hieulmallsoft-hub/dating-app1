import axios from "axios";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
  type AuthTokens,
} from "../lib/authStorage";

export const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
).replace(/\/+$/, "");

export const http = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const refreshClient = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
});

type RefreshResponse = {
  tokens?: AuthTokens;
};

let refreshPromise: Promise<AuthTokens> | null = null;

async function refreshTokens() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  const { data } = await refreshClient.post<RefreshResponse>("/auth/refresh", {
    refreshToken,
  });

  const tokens = data?.tokens;
  if (!tokens?.access_token || !tokens?.refresh_token) {
    throw new Error("Invalid refresh response");
  }

  setTokens(tokens);
  return tokens;
}

function shouldSkipRefresh(url?: string) {
  if (!url) return false;
  return (
    url.includes("/auth/refresh") ||
    url.includes("/auth/google") ||
    url.includes("/auth/local/login") ||
    url.includes("/auth/local/register")
  );
}

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as (typeof error.config & {
      _retry?: boolean;
    }) | null;
    const status = error.response?.status;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !shouldSkipRefresh(originalRequest.url) &&
      getRefreshToken()
    ) {
      originalRequest._retry = true;

      try {
        refreshPromise =
          refreshPromise ??
          refreshTokens().finally(() => {
            refreshPromise = null;
          });

        const tokens = await refreshPromise;
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
        return http(originalRequest);
      } catch {
        clearTokens();
      }
    }

    return Promise.reject(error);
  }
);
