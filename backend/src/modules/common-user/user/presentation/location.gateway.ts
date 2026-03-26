import { OnModuleDestroy, UseGuards } from "@nestjs/common";
import {
    ConnectedSocket,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    WsException
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { WsJwtGuard } from "../../auth/infrastructure/strategies/ws-jwt.guard";
import { CoupleService } from "../../../couple-features/couple/application/couple.service";
import { LocationPresenceService } from "../application/location-presence.service";

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

export type PresenceUpdatedPayload = {
    userId: string;
    status: "online" | "disconnected";
    lastSeenAt: string;
};

@WebSocketGateway({
    cors: {
        origin: "*"
    }
})
export class LocationGateway implements OnModuleDestroy, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly cleanupTimer: NodeJS.Timeout;

    constructor(
        private readonly coupleService: CoupleService,
        private readonly presenceService: LocationPresenceService
    ) {
        this.cleanupTimer = setInterval(() => this.emitExpiredPresence(), 10_000);
    }

    onModuleDestroy() {
        clearInterval(this.cleanupTimer);
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage("location:join")
    async handleJoin(@ConnectedSocket() client: Socket & { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = this.getCurrentUserId(client);
        const couple = await this.coupleService.getMyCouple(userId);
        if (!couple) throw new WsException("Not in couple");

        await client.join(this.roomForCouple(couple.id));
        await this.presenceService.setCoupleId(userId, couple.id);
        const presence = this.presenceService.markOnline(userId, couple.id);
        this.emitPresenceUpdated(couple.id, {
            userId,
            status: presence.status,
            lastSeenAt: new Date(presence.lastSeenAt).toISOString()
        });

        return { event: "location:joined", data: { coupleId: couple.id } };
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage("presence:heartbeat")
    async handleHeartbeat(
        @ConnectedSocket() client: Socket & { user?: { sub?: string; id?: string; user_Id?: string } }
    ) {
        const userId = this.getCurrentUserId(client);
        const presence = await this.presenceService.touch(userId);
        const coupleId = presence.coupleId ?? (await this.presenceService.getCoupleId(userId));
        if (coupleId) {
            this.emitPresenceUpdated(coupleId, {
                userId,
                status: "online",
                lastSeenAt: new Date(presence.lastSeenAt).toISOString()
            });
        }
        return { event: "presence:ack", data: { ok: true } };
    }

    emitLocationUpdated(payload: LocationUpdatedPayload) {
        if (!this.server) return;
        this.server.to(this.roomForCouple(payload.coupleId)).emit("location:updated", payload);
    }

    private emitPresenceUpdated(coupleId: string, payload: PresenceUpdatedPayload) {
        if (!this.server) return;
        this.server.to(this.roomForCouple(coupleId)).emit("presence:updated", payload);
    }

    private roomForCouple(coupleId: string) {
        return `couple:${coupleId}`;
    }

    private getCurrentUserId(client: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = client.user?.sub || client.user?.id || client.user?.user_Id;
        if (!userId) {
            throw new WsException("Unauthorized");
        }
        return userId;
    }

    private emitExpiredPresence() {
        const expired = this.presenceService.sweepExpired();
        if (!expired.length) return;
        expired.forEach(({ userId, record }) => {
            if (!record.coupleId) return;
            this.emitPresenceUpdated(record.coupleId, {
                userId,
                status: record.status,
                lastSeenAt: new Date(record.lastSeenAt).toISOString()
            });
        });
    }

    async handleDisconnect(client: Socket & { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = client.user?.sub || client.user?.id || client.user?.user_Id;
        if (!userId) return;
        const record = await this.presenceService.markDisconnected(userId);
        if (record?.coupleId) {
            this.emitPresenceUpdated(record.coupleId, {
                userId,
                status: record.status,
                lastSeenAt: new Date(record.lastSeenAt).toISOString()
            });
        }
    }
}
