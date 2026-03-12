import { getApp, getApps, initializeApp } from "firebase/app";
import { deleteToken, getMessaging, getToken, isSupported, onMessage, type Messaging } from "firebase/messaging";
import * as notificationsApi from "../api/notifications";

type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

type RuntimeConfig = {
  firebase: FirebaseWebConfig;
  vapidKey: string;
};

const PUSH_TOKEN_STORAGE_KEY = "fzi_push_token";
const FIREBASE_SW_PATH = "/firebase-messaging-sw.js";
const FIREBASE_SW_SCOPE = "/firebase-cloud-messaging-push-scope";

let messagingPromise: Promise<Messaging | null> | null = null;
let serviceWorkerPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let foregroundListenerAttached = false;

function readEnv(name: string) {
  const value = import.meta.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function getRuntimeConfig(): RuntimeConfig | null {
  const firebase: FirebaseWebConfig = {
    apiKey: readEnv("VITE_FIREBASE_API_KEY"),
    authDomain: readEnv("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: readEnv("VITE_FIREBASE_PROJECT_ID"),
    storageBucket: readEnv("VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: readEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: readEnv("VITE_FIREBASE_APP_ID"),
  };
  const vapidKey = readEnv("VITE_FIREBASE_VAPID_KEY");

  const ready = Object.values(firebase).every((item) => item.length > 0) && vapidKey.length > 0;
  return ready ? { firebase, vapidKey } : null;
}

function getFirebaseApp(config: FirebaseWebConfig) {
  if (getApps().length) {
    return getApp();
  }
  return initializeApp(config);
}

function buildServiceWorkerUrl(config: FirebaseWebConfig) {
  const search = new URLSearchParams(config);
  return `${FIREBASE_SW_PATH}?${search.toString()}`;
}

async function ensureServiceWorkerRegistration(
  firebaseConfig: FirebaseWebConfig
): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  if (!serviceWorkerPromise) {
    const workerUrl = buildServiceWorkerUrl(firebaseConfig);
    serviceWorkerPromise = navigator.serviceWorker
      .register(workerUrl, { scope: FIREBASE_SW_SCOPE })
      .catch((error: unknown) => {
        console.warn("FCM service worker registration failed", error);
        return null;
      });
  }
  return serviceWorkerPromise;
}

async function ensureMessaging(config: FirebaseWebConfig): Promise<Messaging | null> {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      const supported = await isSupported().catch(() => false);
      if (!supported) return null;
      const app = getFirebaseApp(config);
      return getMessaging(app);
    })();
  }
  return messagingPromise;
}

function attachForegroundListener(messaging: Messaging) {
  if (foregroundListenerAttached) return;
  foregroundListenerAttached = true;

  onMessage(messaging, (payload) => {
    const title = payload.notification?.title || payload.data?.title;
    const body = payload.notification?.body || payload.data?.body || "Ban vua nhan thong bao moi";
    if (!title) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    if (!document.hidden) return;

    try {
      new Notification(title, { body });
    } catch (error) {
      console.warn("Failed to display foreground notification", error);
    }
  });
}

function getStoredToken() {
  return localStorage.getItem(PUSH_TOKEN_STORAGE_KEY) || "";
}

function storeToken(token: string) {
  localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
}

function clearStoredToken() {
  localStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
}

export async function syncPushTokenWithServer() {
  const runtimeConfig = getRuntimeConfig();
  if (!runtimeConfig) return;
  if (typeof Notification === "undefined") return;

  if (Notification.permission === "denied") {
    return;
  }

  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return;
    }
  }
  if (Notification.permission !== "granted") return;

  const [messaging, swRegistration] = await Promise.all([
    ensureMessaging(runtimeConfig.firebase),
    ensureServiceWorkerRegistration(runtimeConfig.firebase),
  ]);
  if (!messaging || !swRegistration) return;

  attachForegroundListener(messaging);

  const nextToken = await getToken(messaging, {
    vapidKey: runtimeConfig.vapidKey,
    serviceWorkerRegistration: swRegistration,
  });

  if (!nextToken) return;

  const currentToken = getStoredToken();
  if (currentToken === nextToken) return;

  await notificationsApi.registerPushToken({
    token: nextToken,
    platform: "web",
  });

  storeToken(nextToken);

  if (currentToken && currentToken !== nextToken) {
    await notificationsApi.unregisterPushToken({
      token: currentToken,
      platform: "web",
    });
  }
}

export async function unregisterPushTokenFromServer() {
  const runtimeConfig = getRuntimeConfig();
  const currentToken = getStoredToken();
  if (currentToken) {
    try {
      await notificationsApi.unregisterPushToken({
        token: currentToken,
        platform: "web",
      });
    } catch (error) {
      console.warn("Failed to unregister push token", error);
    }
  }
  clearStoredToken();

  if (!runtimeConfig) return;
  const messaging = await ensureMessaging(runtimeConfig.firebase);
  if (!messaging) return;
  try {
    await deleteToken(messaging);
  } catch (error) {
    console.warn("Failed to delete local FCM token", error);
  }
}

export function hasPushMessagingConfig() {
  return Boolean(getRuntimeConfig());
}
