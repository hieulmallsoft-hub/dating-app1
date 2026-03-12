/* global firebase */
const searchParams = new URL(self.location.href).searchParams;

const firebaseConfig = {
  apiKey: searchParams.get("apiKey") || "",
  authDomain: searchParams.get("authDomain") || "",
  projectId: searchParams.get("projectId") || "",
  storageBucket: searchParams.get("storageBucket") || "",
  messagingSenderId: searchParams.get("messagingSenderId") || "",
  appId: searchParams.get("appId") || "",
};

const hasConfig = Object.values(firebaseConfig).every((value) => value && value.length > 0);

if (hasConfig) {
  try {
    importScripts("https://www.gstatic.com/firebasejs/12.2.1/firebase-app-compat.js");
    importScripts("https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging-compat.js");

    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const title = payload?.notification?.title || payload?.data?.title || "Thong bao moi";
      const body = payload?.notification?.body || payload?.data?.body || "Ban vua nhan thong bao moi";
      const link = payload?.fcmOptions?.link || payload?.data?.link || "/";

      self.registration.showNotification(title, {
        body,
        icon: "/vite.svg",
        data: { link },
      });
    });
  } catch (error) {
    console.error("FCM service worker init failed", error);
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.link || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
