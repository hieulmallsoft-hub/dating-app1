/* eslint-disable no-console */
const { io } = require("socket.io-client");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || "";

if (!ACCESS_TOKEN) {
    console.error("Missing ACCESS_TOKEN env var.");
    process.exit(1);
}

async function apiRequest(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        ...(options.headers || {})
    };
    const response = await fetch(url, { ...options, headers });
    const text = await response.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }
    if (!response.ok) {
        const message = typeof data === "string" ? data : JSON.stringify(data);
        throw new Error(`HTTP ${response.status} ${response.statusText} - ${message}`);
    }
    return data;
}

function waitForEvent(socket, event, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(event, handler);
            reject(new Error(`Timeout waiting for ${event}`));
        }, timeoutMs);

        const handler = (payload) => {
            clearTimeout(timer);
            socket.off(event, handler);
            resolve(payload);
        };

        socket.on(event, handler);
    });
}

async function main() {
    console.log(`BASE_URL=${BASE_URL}`);
    console.log("Connecting socket...");

    const socket = io(BASE_URL, {
        auth: { token: ACCESS_TOKEN },
        transports: ["websocket"]
    });

    const socketReady = new Promise((resolve, reject) => {
        socket.on("connect", resolve);
        socket.on("connect_error", (err) => reject(err));
    });

    await socketReady;
    console.log("Socket connected. Emitting location:join...");

    socket.on("exception", (payload) => {
        console.warn("Socket exception", payload?.message || payload);
    });

    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Join ack timeout")), 5000);
        socket.emit("location:join", {}, (ack) => {
            clearTimeout(timer);
            console.log("Join ack", ack?.data?.coupleId || "");
            resolve(ack);
        });
    }).catch((err) => {
        console.warn("Join ack failed:", err.message);
    });

    console.log("Sending PATCH /profile/location...");
    const locationEventPromise = waitForEvent(socket, "location:updated", 8000);
    await apiRequest("/profile/location", {
        method: "PATCH",
        body: JSON.stringify({
            lat: 21.0067,
            lng: 105.8486,
            accuracy: 4,
            batteryLevel: 50,
            isCharging: false,
            speed: 1.2,
            timestamp: Date.now()
        })
    });

    const eventPayload = await locationEventPromise;
    console.log("Received location:updated", eventPayload);

    socket.disconnect();
    console.log("Test completed successfully.");
}

main().catch((err) => {
    console.error("Test failed:", err.message);
    process.exit(1);
});
