import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L, {
  type Circle,
  type LatLngTuple,
  type LeafletMouseEvent,
  type Map as LeafletMap,
  type Marker,
  type Polyline,
} from "leaflet";
import "leaflet/dist/leaflet.css";
import * as coupleApi from "../api/couple";
import * as locationApi from "../api/location";
import { getHttpMessage, getHttpStatus } from "../api/error";

type Props = {
  onAuthInvalid: () => void;
};

type ViewMode = "home" | "history";

type LivePoint = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
};

type HistoryItem = LivePoint & {
  owner: "me" | "partner";
};

const DEFAULT_CENTER: LatLngTuple = [10.77653, 106.700981];
const REFRESH_COUPLE_INTERVAL_MS = 8000;
const SHARE_INTERVAL_MS = 12000;
const MIN_SHARE_DISTANCE_M = 15;
const MAX_HISTORY_POINTS = 80;
const MIN_SYNC_ACCURACY_M = 120;
const MAX_DISPLAY_ACCURACY_M = 2000;
const MAX_NOISY_ACCURACY_M = 4000;

function hasCoordinates(
  user: coupleApi.CoupleLocationUser | null | undefined
): user is coupleApi.CoupleLocationUser & { latitude: number; longitude: number } {
  return typeof user?.latitude === "number" && typeof user?.longitude === "number";
}

function formatCoord(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return value.toFixed(6);
}

function formatTime(value: number | string | null | undefined) {
  if (!value) return "Chua cap nhat";
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "Chua cap nhat";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function getDisplayName(user: coupleApi.CoupleLocationUser | null | undefined, fallback = "Unknown") {
  if (!user) return fallback;
  return user.fullName || user.email || fallback;
}

function getInitial(user: coupleApi.CoupleLocationUser | null | undefined, fallback: string) {
  const base = getDisplayName(user, fallback).trim();
  return (base[0] || fallback[0] || "?").toUpperCase();
}

function isNotInCoupleError(status: number | undefined, message: string) {
  if (status !== 404) return false;
  return message.toLowerCase().includes("not in a couple");
}

function escapeAttr(value: string) {
  return value.replace(/"/g, "&quot;");
}

function toLatLng(latitude: number, longitude: number): LatLngTuple {
  return [Number(latitude), Number(longitude)];
}

function mergePartnerRealtime(
  base: coupleApi.CoupleLocationsResponse,
  realtime: locationApi.PartnerRealtimeLocationResponse | null
) {
  if (!realtime?.partner) {
    return base;
  }

  const fallbackPartner: coupleApi.CoupleLocationUser = {
    id: realtime.partner.userId,
    fullName: null,
    email: "",
    avatar: null,
    latitude: null,
    longitude: null,
    lastActiveAt: null,
  };

  const existingPartner = base.partner ?? fallbackPartner;
  return {
    ...base,
    partner: {
      ...existingPartner,
      id: existingPartner.id || realtime.partner.userId,
      latitude: realtime.partner.lat ?? existingPartner.latitude,
      longitude: realtime.partner.lng ?? existingPartner.longitude,
      lastActiveAt:
        typeof realtime.partner.lastUpdated === "number"
          ? new Date(realtime.partner.lastUpdated).toISOString()
          : existingPartner.lastActiveAt,
    },
  };
}

function haversineMeters(a: LatLngTuple, b: LatLngTuple) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(rLat1) * Math.cos(rLat2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return 6371000 * c;
}

function formatDistance(distanceM: number | null) {
  if (distanceM === null) return "Chua co";
  if (distanceM < 1000) return `${Math.round(distanceM)}m`;
  return `${(distanceM / 1000).toFixed(2)}km`;
}

function fromHistoryPoint(item: coupleApi.CoupleLocationHistoryPoint): LivePoint {
  return {
    latitude: item.latitude,
    longitude: item.longitude,
    accuracy: item.accuracy ?? 30,
    timestamp: new Date(item.createdAt).getTime(),
  };
}

function mergeLivePoints(previous: LivePoint[], incoming: LivePoint[]) {
  const pointMap = new Map<string, LivePoint>();
  [...previous, ...incoming].forEach((item) => {
    const key = `${item.timestamp}:${item.latitude.toFixed(6)}:${item.longitude.toFixed(6)}`;
    pointMap.set(key, item);
  });

  return [...pointMap.values()]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-MAX_HISTORY_POINTS);
}

function createAvatarMarker(
  user: coupleApi.CoupleLocationUser | null | undefined,
  role: "me" | "partner"
) {
  const initial = getInitial(user, role === "me" ? "M" : "P");
  const avatar = user?.avatar ? escapeAttr(user.avatar) : "";
  const avatarHtml = avatar
    ? `<img src="${avatar}" alt="${initial}" />`
    : `<span class="location-marker-fallback">${initial}</span>`;

  return L.divIcon({
    className: "location-marker-wrapper",
    html: `<div class="location-marker ${role}">
      <span class="location-marker-pulse"></span>
      <span class="location-marker-core">${avatarHtml}</span>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function getBestCurrentPosition(durationMs = 12000) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Browser does not support geolocation"));
      return;
    }

    let best: GeolocationPosition | null = null;
    let settled = false;
    let watchId = -1;
    let timeoutId = 0;

    const finish = (
      status: "resolve" | "reject",
      payload: GeolocationPosition | GeolocationPositionError | Error
    ) => {
      if (settled) return;
      settled = true;
      if (watchId !== -1) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      if (status === "resolve") {
        resolve(payload as GeolocationPosition);
      } else {
        reject(payload);
      }
    };

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!best || position.coords.accuracy < best.coords.accuracy) {
          best = position;
        }

        if (position.coords.accuracy <= 40) {
          finish("resolve", best);
        }
      },
      (error) => {
        finish("reject", error);
      },
      {
        enableHighAccuracy: true,
        timeout: durationMs,
        maximumAge: 0,
      }
    );

    timeoutId = window.setTimeout(() => {
      if (best) {
        finish("resolve", best);
      } else {
        finish("reject", new Error("No location sample"));
      }
    }, durationMs);
  });
}

export default function PlacesPanel({ onAuthInvalid }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const meMarkerRef = useRef<Marker | null>(null);
  const partnerMarkerRef = useRef<Marker | null>(null);
  const meAccuracyCircleRef = useRef<Circle | null>(null);
  const closeCircleRef = useRef<Circle | null>(null);
  const historyPolylineRef = useRef<Polyline | null>(null);
  const partnerHistoryPolylineRef = useRef<Polyline | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastSharedPointRef = useRef<LivePoint | null>(null);
  const livePointRef = useRef<LivePoint | null>(null);
  const syncLockRef = useRef(false);
  const hasAutoCenteredRef = useRef(false);

  const [locations, setLocations] = useState<coupleApi.CoupleLocationsResponse | null>(null);
  const [livePoint, setLivePoint] = useState<LivePoint | null>(null);
  const [historyPoints, setHistoryPoints] = useState<LivePoint[]>([]);
  const [partnerHistoryPoints, setPartnerHistoryPoints] = useState<LivePoint[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [isManualPickMode, setIsManualPickMode] = useState(false);

  const [permissionState, setPermissionState] = useState<"unknown" | "prompt" | "granted" | "denied">(
    "unknown"
  );
  const [notificationState, setNotificationState] = useState<"default" | "granted" | "denied" | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isSharingManual, setIsSharingManual] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Chua dong bo");
  const [error, setError] = useState<string | null>(null);

  const mePoint = useMemo<LatLngTuple | null>(() => {
    if (livePoint) return toLatLng(livePoint.latitude, livePoint.longitude);
    if (hasCoordinates(locations?.me)) return toLatLng(locations.me.latitude, locations.me.longitude);
    return null;
  }, [livePoint, locations?.me]);

  const partnerPoint = useMemo<LatLngTuple | null>(() => {
    if (hasCoordinates(locations?.partner)) return toLatLng(locations.partner.latitude, locations.partner.longitude);
    return null;
  }, [locations?.partner]);

  const distanceToPartner = useMemo(() => {
    if (!mePoint || !partnerPoint) return null;
    return haversineMeters(mePoint, partnerPoint);
  }, [mePoint, partnerPoint]);

  const closeEachOther = distanceToPartner !== null && distanceToPartner <= 200;

  const loadLocations = useCallback(async () => {
    try {
      const data = await coupleApi.getCoupleLocations();
      let merged = data;

      try {
        const realtime = await locationApi.getPartnerRealtimeLocation();
        merged = mergePartnerRealtime(data, realtime);
      } catch (partnerErr: unknown) {
        const partnerStatus = getHttpStatus(partnerErr);
        if (partnerStatus === 401) {
          onAuthInvalid();
          return;
        }
      }

      setLocations(merged);
      setError(null);
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      const message = getHttpMessage(err, "Failed to load locations");
      if (status === 401) {
        onAuthInvalid();
        return;
      }

      if (isNotInCoupleError(status, message)) {
        setLocations(null);
        setError("Ban chua ghep doi. Hay ghep doi de xem location tren map.");
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onAuthInvalid]);

  const loadHistory = useCallback(
    async (limit = MAX_HISTORY_POINTS) => {
      setIsHistoryLoading(true);
      try {
        const data = await coupleApi.getCoupleLocationHistory(limit);
        const meHistory = data.me.map(fromHistoryPoint);
        const partnerHistory = data.partner.map(fromHistoryPoint);
        setHistoryPoints((prev) => mergeLivePoints(prev, meHistory));
        setPartnerHistoryPoints((prev) => mergeLivePoints(prev, partnerHistory));
      } catch (err: unknown) {
        const status = getHttpStatus(err);
        if (status === 401) {
          onAuthInvalid();
          return;
        }
        setError(getHttpMessage(err, "Khong the tai lich su vi tri"));
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [onAuthInvalid]
  );

  const syncPointToServer = useCallback(
    async (point: LivePoint, silent = true) => {
      if (point.accuracy > MIN_SYNC_ACCURACY_M) {
        setSyncStatus(
          `GPS chua du chinh xac (${Math.round(point.accuracy)}m), khong dong bo server`
        );
        return;
      }

      if (syncLockRef.current) return;
      syncLockRef.current = true;
      if (!silent) {
        setIsSharingManual(true);
      }

      try {
        await locationApi.updateRealtimeLocation({
          lat: Number(point.latitude.toFixed(7)),
          lng: Number(point.longitude.toFixed(7)),
          accuracy: Number(point.accuracy.toFixed(1)),
          timestamp: point.timestamp,
        });
        lastSharedPointRef.current = point;
        setSyncStatus(`Da dong bo (${Math.round(point.accuracy)}m) luc ${formatTime(point.timestamp)}`);
        setLocations((prev) => {
          if (!prev?.me) return prev;
          return {
            ...prev,
            me: {
              ...prev.me,
              latitude: point.latitude,
              longitude: point.longitude,
              lastActiveAt: new Date(point.timestamp).toISOString(),
            },
          };
        });
      } catch (err: unknown) {
        const status = getHttpStatus(err);
        if (status === 401) {
          onAuthInvalid();
          return;
        }
        setError(getHttpMessage(err, "Khong the cap nhat vi tri cua ban"));
        setSyncStatus("Dong bo that bai");
      } finally {
        syncLockRef.current = false;
        if (!silent) {
          setIsSharingManual(false);
        }
      }
    },
    [onAuthInvalid]
  );

  const shouldSharePoint = useCallback((point: LivePoint) => {
    const last = lastSharedPointRef.current;
    if (!last) return true;

    const elapsed = point.timestamp - last.timestamp;
    const moved = haversineMeters(
      toLatLng(point.latitude, point.longitude),
      toLatLng(last.latitude, last.longitude)
    );

    if (elapsed >= SHARE_INTERVAL_MS) return true;
    return moved >= MIN_SHARE_DISTANCE_M && elapsed >= 4000;
  }, []);

  const handleIncomingPoint = useCallback(
    (point: LivePoint, skipAutoSync = false) => {
      setPermissionState("granted");
      setIsTracking(true);
      if (point.accuracy > MAX_NOISY_ACCURACY_M) {
        setSyncStatus(
          `Tin hieu qua yeu (${Math.round(point.accuracy)}m), hay chon vi tri thu cong tren map`
        );
        return;
      }

      const prev = livePointRef.current;
      if (prev && point.accuracy > prev.accuracy * 1.8 && point.accuracy > 300) {
        setSyncStatus(`Bo qua diem nhieu (${Math.round(point.accuracy)}m)`);
        return;
      }

      if (point.accuracy > MAX_DISPLAY_ACCURACY_M) {
        setSyncStatus(
          `Vi tri tam thoi sai so lon (${Math.round(point.accuracy)}m), da hien vi tri uoc luong`
        );
      }

      livePointRef.current = point;
      setLivePoint(point);
      setError(null);
      setLocations((prev) => {
        if (!prev?.me) return prev;
        return {
          ...prev,
          me: {
            ...prev.me,
            latitude: point.latitude,
            longitude: point.longitude,
            lastActiveAt: new Date(point.timestamp).toISOString(),
          },
        };
      });

      setHistoryPoints((prev) => {
        const last = prev[prev.length - 1];
        if (last) {
          const moved = haversineMeters(
            toLatLng(last.latitude, last.longitude),
            toLatLng(point.latitude, point.longitude)
          );
          if (moved < 3) {
            return prev.map((item, index) => (index === prev.length - 1 ? point : item));
          }
        }
        return mergeLivePoints(prev, [point]);
      });

      if (point.accuracy > MIN_SYNC_ACCURACY_M) {
        setSyncStatus(
          `GPS chua chinh xac (${Math.round(point.accuracy)}m), bam "Chon tay" neu muon chot dung diem`
        );
        return;
      }

      if (!skipAutoSync && shouldSharePoint(point)) {
        void syncPointToServer(point, true);
      }
    },
    [shouldSharePoint, syncPointToServer]
  );

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Trinh duyet khong ho tro dinh vi.");
      return;
    }
    if (watchIdRef.current !== null) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const point: LivePoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp || Date.now(),
        };
        handleIncomingPoint(point);
      },
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setPermissionState("denied");
          stopTracking();
          setError("Ban da tu choi quyen vi tri. Hay cap quyen de theo doi realtime.");
          return;
        }
        setError("Khong the theo doi vi tri realtime. Thu lai sau.");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );

    watchIdRef.current = watchId;
    setIsTracking(true);
  }, [handleIncomingPoint, stopTracking]);

  const requestLocationPermission = useCallback(async () => {
    try {
      const position = await getBestCurrentPosition();
      const point: LivePoint = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp || Date.now(),
      };
      handleIncomingPoint(point);
      setPermissionState("granted");
      startTracking();
      setSyncStatus("Dang theo doi vi tri...");
    } catch {
      setPermissionState("denied");
      setError("Khong lay duoc vi tri. Hay bat GPS va cap quyen location.");
    }
  }, [handleIncomingPoint, startTracking]);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === "undefined") {
      setNotificationState("unsupported");
      return;
    }

    const result = await Notification.requestPermission();
    setNotificationState(result);
  }, []);

  const recenterMap = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const bounds = L.latLngBounds([]);
    if (mePoint) bounds.extend(mePoint);
    if (partnerPoint) bounds.extend(partnerPoint);

    if (viewMode === "history" && historyPoints.length > 1) {
      historyPoints.forEach((item) => bounds.extend([item.latitude, item.longitude]));
    }
    if (viewMode === "history" && partnerHistoryPoints.length > 1) {
      partnerHistoryPoints.forEach((item) => bounds.extend([item.latitude, item.longitude]));
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.35), { maxZoom: 17, animate: true });
      return;
    }

    if (mePoint) {
      map.setView(mePoint, 16, { animate: true });
      return;
    }

    map.setView(DEFAULT_CENTER, 13, { animate: true });
  }, [historyPoints, mePoint, partnerHistoryPoints, partnerPoint, viewMode]);

  const shareNow = useCallback(async () => {
    setError(null);
    try {
      const position = await getBestCurrentPosition();
      const point: LivePoint = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp || Date.now(),
      };

      handleIncomingPoint(point, true);
      await syncPointToServer(point, false);
      await Promise.all([loadLocations(), loadHistory()]);
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 401) {
        onAuthInvalid();
      } else {
        setError(getHttpMessage(err, "Khong the chia se vi tri"));
      }
    }
  }, [handleIncomingPoint, loadHistory, loadLocations, onAuthInvalid, syncPointToServer]);

  useEffect(() => {
    let active = true;
    let permissionStatus: PermissionStatus | null = null;

    const initPermission = async () => {
      if (!("permissions" in navigator)) {
        setPermissionState("prompt");
        return;
      }

      try {
        permissionStatus = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });

        if (!active) return;
        setPermissionState(permissionStatus.state);
        if (permissionStatus.state === "granted") {
          startTracking();
        }

        permissionStatus.onchange = () => {
          const nextState = permissionStatus?.state || "prompt";
          setPermissionState(nextState);
          if (nextState === "granted") {
            startTracking();
          }
          if (nextState === "denied") {
            stopTracking();
          }
        };
      } catch {
        setPermissionState("prompt");
      }
    };

    void initPermission();

    return () => {
      active = false;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [startTracking, stopTracking]);

  useEffect(() => {
    void loadLocations();
    const intervalId = window.setInterval(() => {
      void loadLocations();
    }, REFRESH_COUPLE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [loadLocations]);

  useEffect(() => {
    if (viewMode !== "history") return;
    void loadHistory();
  }, [loadHistory, viewMode]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(DEFAULT_CENTER, 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      meMarkerRef.current = null;
      partnerMarkerRef.current = null;
      meAccuracyCircleRef.current = null;
      closeCircleRef.current = null;
      historyPolylineRef.current = null;
      partnerHistoryPolylineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onMapClick = (event: LeafletMouseEvent) => {
      if (!isManualPickMode) return;

      const point: LivePoint = {
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
        accuracy: 5,
        timestamp: Date.now(),
      };

      handleIncomingPoint(point, true);
      setIsManualPickMode(false);
      setSyncStatus("Da chon vi tri thu cong, dang dong bo...");
      void (async () => {
        await syncPointToServer(point, false);
        await Promise.all([loadLocations(), loadHistory()]);
      })();
    };

    map.on("click", onMapClick);
    return () => {
      map.off("click", onMapClick);
    };
  }, [handleIncomingPoint, isManualPickMode, loadHistory, loadLocations, syncPointToServer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (mePoint) {
      const meUser = locations?.me;
      if (!meMarkerRef.current) {
        meMarkerRef.current = L.marker(mePoint, {
          icon: createAvatarMarker(meUser, "me"),
          zIndexOffset: 500,
        }).addTo(map);
      } else {
        meMarkerRef.current.setLatLng(mePoint);
        meMarkerRef.current.setIcon(createAvatarMarker(meUser, "me"));
      }
      meMarkerRef.current.bindPopup(
        `<b>Me</b><br/>${getDisplayName(meUser, "Ban")}<br/>${formatCoord(mePoint[0])}, ${formatCoord(
          mePoint[1]
        )}`
      );
    } else if (meMarkerRef.current) {
      map.removeLayer(meMarkerRef.current);
      meMarkerRef.current = null;
    }

    if (partnerPoint) {
      const partnerUser = locations?.partner;
      if (!partnerMarkerRef.current) {
        partnerMarkerRef.current = L.marker(partnerPoint, {
          icon: createAvatarMarker(partnerUser, "partner"),
          zIndexOffset: 400,
        }).addTo(map);
      } else {
        partnerMarkerRef.current.setLatLng(partnerPoint);
        partnerMarkerRef.current.setIcon(createAvatarMarker(partnerUser, "partner"));
      }
      partnerMarkerRef.current.bindPopup(
        `<b>Partner</b><br/>${getDisplayName(partnerUser, "Nguoi ay")}<br/>${formatCoord(
          partnerPoint[0]
        )}, ${formatCoord(partnerPoint[1])}`
      );
    } else if (partnerMarkerRef.current) {
      map.removeLayer(partnerMarkerRef.current);
      partnerMarkerRef.current = null;
    }

    if (mePoint && livePoint?.accuracy) {
      const radius = Math.max(20, Math.min(120, livePoint.accuracy));
      if (!meAccuracyCircleRef.current) {
        meAccuracyCircleRef.current = L.circle(mePoint, {
          radius,
          color: "#ff4d80",
          fillColor: "#ff4d80",
          fillOpacity: 0.09,
          weight: 1,
        }).addTo(map);
      } else {
        meAccuracyCircleRef.current.setLatLng(mePoint);
        meAccuracyCircleRef.current.setRadius(radius);
      }
    } else if (meAccuracyCircleRef.current) {
      map.removeLayer(meAccuracyCircleRef.current);
      meAccuracyCircleRef.current = null;
    }

    if (closeEachOther && mePoint && partnerPoint && distanceToPartner !== null) {
      const center: LatLngTuple = [(mePoint[0] + partnerPoint[0]) / 2, (mePoint[1] + partnerPoint[1]) / 2];
      const radius = Math.max(35, distanceToPartner / 2);
      if (!closeCircleRef.current) {
        closeCircleRef.current = L.circle(center, {
          radius,
          color: "#22c55e",
          fillColor: "#22c55e",
          fillOpacity: 0.05,
          weight: 1.5,
          dashArray: "6 4",
        }).addTo(map);
      } else {
        closeCircleRef.current.setLatLng(center);
        closeCircleRef.current.setRadius(radius);
      }
    } else if (closeCircleRef.current) {
      map.removeLayer(closeCircleRef.current);
      closeCircleRef.current = null;
    }

    if (viewMode === "history" && historyPoints.length > 1) {
      const latlngs: LatLngTuple[] = historyPoints.map((item) => [item.latitude, item.longitude]);
      if (!historyPolylineRef.current) {
        historyPolylineRef.current = L.polyline(latlngs, {
          color: "#0ea5e9",
          weight: 3,
          opacity: 0.8,
        }).addTo(map);
      } else {
        historyPolylineRef.current.setLatLngs(latlngs);
      }
    } else if (historyPolylineRef.current) {
      map.removeLayer(historyPolylineRef.current);
      historyPolylineRef.current = null;
    }

    if (viewMode === "history" && partnerHistoryPoints.length > 1) {
      const latlngs: LatLngTuple[] = partnerHistoryPoints.map((item) => [
        item.latitude,
        item.longitude,
      ]);
      if (!partnerHistoryPolylineRef.current) {
        partnerHistoryPolylineRef.current = L.polyline(latlngs, {
          color: "#ff4d80",
          weight: 2.5,
          opacity: 0.65,
          dashArray: "8 6",
        }).addTo(map);
      } else {
        partnerHistoryPolylineRef.current.setLatLngs(latlngs);
      }
    } else if (partnerHistoryPolylineRef.current) {
      map.removeLayer(partnerHistoryPolylineRef.current);
      partnerHistoryPolylineRef.current = null;
    }

    if (!hasAutoCenteredRef.current && (mePoint || partnerPoint)) {
      recenterMap();
      hasAutoCenteredRef.current = true;
    }
  }, [
    closeEachOther,
    distanceToPartner,
    historyPoints,
    partnerHistoryPoints,
    livePoint?.accuracy,
    locations?.me,
    locations?.partner,
    mePoint,
    partnerPoint,
    recenterMap,
    viewMode,
  ]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (viewMode === "history") {
      recenterMap();
    }
  }, [recenterMap, viewMode]);

  useEffect(() => {
    return () => stopTracking();
  }, [stopTracking]);

  const meName = getDisplayName(locations?.me, "Ban");
  const partnerName = getDisplayName(locations?.partner, "Nguoi ay");
  const meTime = formatTime(livePoint?.timestamp || locations?.me?.lastActiveAt);
  const partnerTime = formatTime(locations?.partner?.lastActiveAt);
  const distanceLabel = formatDistance(distanceToPartner);
  const currentAccuracyLabel = livePoint ? `${Math.round(livePoint.accuracy)}m` : "N/A";
  const locationStatus = closeEachOther
    ? "Hai nguoi dang o gan nhau (<200m)"
    : distanceToPartner !== null
      ? `Khoang cach hien tai: ${distanceLabel}`
      : "Chua du du lieu vi tri";

  const latestHistory: HistoryItem[] = [
    ...historyPoints.map((item) => ({ ...item, owner: "me" as const })),
    ...partnerHistoryPoints.map((item) => ({ ...item, owner: "partner" as const })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  return (
    <div className="panel location-panel">
      <div className="panel-title">
        <h3>Location realtime</h3>
        <p>Map hien vi tri cua ban va couple, cap nhat tu dong</p>
      </div>

      {error ? <div className="panel-error">{error}</div> : null}

      <div className="location-map-shell">
        <div className="location-top-row">
          <span className={`location-chip ${closeEachOther ? "active" : ""}`}>{locationStatus}</span>
          <span className="location-chip muted">Acc: {currentAccuracyLabel}</span>
          <span className="location-chip muted">{syncStatus}</span>
        </div>

        <div ref={mapContainerRef} className={`live-map ${isManualPickMode ? "pick-mode" : ""}`} />

        <div className="location-float-controls">
          <button className="location-float-btn" type="button" onClick={recenterMap} title="Recenter map">
            Center
          </button>
          <button
            className="location-float-btn"
            type="button"
            onClick={() => void loadLocations()}
            title="Refresh locations"
          >
            Reload
          </button>
        </div>

        {permissionState !== "granted" ? (
          <div className="location-permission-overlay">
            <div className="location-permission-sheet">
              <div className="location-permission-badge">Location</div>
              <h4>Enable Real-time Location</h4>
              <p>Cho phep GPS de map hien dung vi tri cua ban va partner.</p>
              <div className="location-permission-actions">
                <button className="btn btn-small btn-primary" type="button" onClick={() => void requestLocationPermission()}>
                  Allow location
                </button>
                {notificationState === "default" ? (
                  <button
                    className="btn btn-small btn-outline"
                    type="button"
                    onClick={() => void requestNotificationPermission()}
                  >
                    Bat thong bao
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="location-bottom-sheet">
        <div className="location-users-grid">
          <div className="location-user-card">
            <div className="location-user-head">
              <span className="location-user-dot me" />
              <strong>{meName}</strong>
            </div>
            <div className="location-user-meta">
              <span>
                {formatCoord(mePoint?.[0])}, {formatCoord(mePoint?.[1])}
              </span>
              <span>Update: {meTime}</span>
            </div>
          </div>

          <div className="location-user-card">
            <div className="location-user-head">
              <span className="location-user-dot partner" />
              <strong>{partnerName}</strong>
            </div>
            <div className="location-user-meta">
              <span>
                {formatCoord(partnerPoint?.[0])}, {formatCoord(partnerPoint?.[1])}
              </span>
              <span>Update: {partnerTime}</span>
            </div>
          </div>
        </div>

        <div className="location-action-row">
          <button
            className={`location-tab-btn ${viewMode === "home" ? "active" : ""}`}
            type="button"
            onClick={() => setViewMode("home")}
          >
            Home
          </button>
          <button
            className={`location-tab-btn ${viewMode === "history" ? "active" : ""}`}
            type="button"
            onClick={() => setViewMode("history")}
          >
            History
          </button>
          <button
            className="location-tab-btn"
            type="button"
            disabled={isSharingManual}
            onClick={() => void shareNow()}
          >
            {isSharingManual ? "Dang chia se..." : "Share now"}
          </button>
          <button
            className={`location-tab-btn ${isManualPickMode ? "active" : ""}`}
            type="button"
            onClick={() => {
              setIsManualPickMode((prev) => {
                const next = !prev;
                setSyncStatus(
                  next
                    ? "Che do chon tay: bam vao map de dat dung vi tri"
                    : "Tat che do chon tay"
                );
                return next;
              });
            }}
          >
            {isManualPickMode ? "Cancel pick" : "Chon tay"}
          </button>
          <button
            className="location-tab-btn"
            type="button"
            onClick={() => {
              if (isTracking) {
                stopTracking();
                setSyncStatus("Tam dung tracking");
              } else {
                startTracking();
                setSyncStatus("Dang theo doi vi tri...");
              }
            }}
          >
            {isTracking ? "Pause" : "Track"}
          </button>
        </div>

        {viewMode === "history" ? (
          <div className="location-history-list">
            {isHistoryLoading ? (
              <div className="location-empty">Dang tai lich su vi tri...</div>
            ) : latestHistory.length ? (
              latestHistory.map((item, index) => (
                <div className="location-history-item" key={`${item.timestamp}-${index}`}>
                  <div className="location-history-main">
                    {item.owner === "me" ? "Me" : "Partner"} - {formatTime(item.timestamp)}
                  </div>
                  <div className="location-history-sub">
                    {formatCoord(item.latitude)}, {formatCoord(item.longitude)} | acc ~
                    {Math.round(item.accuracy)}m
                  </div>
                </div>
              ))
            ) : (
              <div className="location-empty">Chua co lich su di chuyen.</div>
            )}
          </div>
        ) : (
          <div className="location-empty">
            {isLoading
              ? "Dang tai du lieu location..."
              : notificationState === "granted"
                ? "Thong bao da bat. Ban se nhan update khi co thay doi vi tri."
                : "Bat thong bao de nhan tin hieu khi partner cap nhat vi tri."}
          </div>
        )}
      </div>
    </div>
  );
}
