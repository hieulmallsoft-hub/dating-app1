import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";

export type LocationUpdatedPayload = {
    coupleId: string;
    userId: string;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    batteryLevel: number | null;
    isCharging: boolean | null;
    speed: number | null;
    lastActiveAt: string;
};

@WebSocketGateway({
    cors: {
        origin: "*"
    }
})
export class LocationGateway {
    @WebSocketServer()
    server: Server;

    emitLocationUpdated(payload: LocationUpdatedPayload) {
        if (!this.server) return;
        this.server.to(this.roomForCouple(payload.coupleId)).emit("location:updated", payload);
    }

    private roomForCouple(coupleId: string) {
        return `couple:${coupleId}`;
    }
}
