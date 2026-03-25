/* eslint-disable no-console */
const { io } = require("socket.io-client");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || "";

if (!ACCESS_TOKEN) {
    console.error("Missing ACCESS_TOKEN env var.");
    process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

function waitForEvent(socket, event, matcher, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(event, handler);
            reject(new Error(`Timeout waiting for ${event}`));
        }, timeoutMs);

        const handler = (payload) => {
            console.log(`Received ${event} event`, payload?.id || "");
            if (matcher(payload)) {
                clearTimeout(timer);
                socket.off(event, handler);
                resolve(payload);
            }
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
    console.log("Socket connected. Emitting places:join...");

    socket.on("places:joined", (payload) => {
        console.log("Received places:joined event", payload?.coupleId || "");
    });

    socket.on("exception", (payload) => {
        console.warn("Socket exception", payload?.message || payload);
    });

    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Join ack timeout")), 5000);
        socket.emit("places:join", {}, (ack) => {
            clearTimeout(timer);
            console.log("Join ack", ack?.data?.coupleId || "");
            resolve(ack);
        });
    }).catch((err) => {
        console.warn("Join ack failed:", err.message);
    });

    await sleep(300);

    console.log("Creating place via REST...");
    const createdEventPromise = waitForEvent(
        socket,
        "places:created",
        (payload) => payload && payload.id
    );
    const created = await apiRequest("/places", {
        method: "POST",
        body: JSON.stringify({
            name: "Realtime Test Place",
            address: "123 Nguyen Trai, Q1",
            latitude: 10.762622,
            longitude: 106.660172,
            radius: 200,
            placeType: "HOME",
            iconResName: "ic_home",
            isSynced: true,
            isDeleted: false
        })
    });
    const createdEvent = await createdEventPromise;
    if (createdEvent?.id !== created.id) {
        throw new Error("places:created payload mismatch");
    }
    console.log("Received places:created", createdEvent?.id);

    console.log("Updating place via REST...");
    const updatedEventPromise = waitForEvent(
        socket,
        "places:updated",
        (payload) => payload && payload.id === created.id
    );
    const updated = await apiRequest(`/places/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify({
            name: "Realtime Test Place Updated",
            radius: 300
        })
    });
    const updatedEvent = await updatedEventPromise;
    if (updatedEvent?.id !== updated.id) {
        throw new Error("places:updated payload mismatch");
    }
    console.log("Received places:updated", updatedEvent?.id);

    console.log("Deleting place via REST...");
    const deletedEventPromise = waitForEvent(
        socket,
        "places:deleted",
        (payload) => payload && payload.id === created.id
    );
    const deleted = await apiRequest(`/places/${created.id}`, {
        method: "DELETE"
    });
    const deletedEvent = await deletedEventPromise;
    if (deletedEvent?.id !== deleted.id) {
        throw new Error("places:deleted payload mismatch");
    }
    console.log("Received places:deleted", deletedEvent?.id);

    socket.disconnect();
    console.log("Test completed successfully.");
}

main().catch((err) => {
    console.error("Test failed:", err.message);
    process.exit(1);
});
