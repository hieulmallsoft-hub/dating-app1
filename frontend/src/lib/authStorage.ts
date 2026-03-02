const ACCESS_TOKEN_KEY = "fzi_access_token";
const REFRESH_TOKEN_KEY = "fzi_refresh_token";

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(tokens: AuthTokens) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem("fzi_logged_in");
}

export function hasAuthTokens() {
  return Boolean(getAccessToken());
}

