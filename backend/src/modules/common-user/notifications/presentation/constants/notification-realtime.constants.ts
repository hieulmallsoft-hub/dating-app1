export const NOTIFICATION_SOCKET_EVENTS = {
    join: "notification:join",
    joined: "notification:joined",
    leave: "notification:leave",
    left: "notification:left",
    created: "notification:new",
    read: "notification:read"
} as const;

export const NOTIFICATION_SOCKET_ROOM_PREFIX = "user:";
