export const NOTIFICATION_SOCKET_EVENTS = {
    join: "notification:join",
    joined: "notification:joined",
    leave: "notification:leave",
    left: "notification:left",
    created: "notification:new"
} as const;

export const NOTIFICATION_SOCKET_ROOM_PREFIX = "user:";
