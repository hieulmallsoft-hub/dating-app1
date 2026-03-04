import { Logger, UseGuards } from "@nestjs/common";
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    WsException
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { WsJwtGuard } from "../../../common-user/auth/infrastructure/strategies/ws-jwt.guard";
import { CoupleService } from "../../couple/application/couple.service";
import { LocationService } from "../application/location.service";
import { HeartbeatDto, UpdateRealtimeLocationDto } from "./dto/location.dto";

type AuthSocket = Socket & {
    user?: { sub?: string; id?: string; user_Id?: string };
};

@WebSocketGateway({
    cors: {
        origin: true,
        credentials: true
    }
})
export class LocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(LocationGateway.name);

    constructor(
        private readonly coupleService: CoupleService,
        private readonly locationService: LocationService
    ) {}

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage("location:join")
    async handleJoin(@ConnectedSocket() client: AuthSocket) {
        const userId = this.getCurrentUserId(client);
        const couple = await this.coupleService.getMyCouple(userId);
        const room = this.roomForCouple(couple.id);
        const partnerId = couple.user1Id === userId ? couple.user2Id : couple.user1Id;

        client.join(room);
        if (partnerId) {
            this.server.to(room).emit("live_boost_on", {
                targetUserId: partnerId,
                viewerId: userId
            });
        }

        return { event: "location:joined", data: { coupleId: couple.id } };
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage("location:leave")
    async handleLeave(@ConnectedSocket() client: AuthSocket) {
        const userId = this.getCurrentUserId(client);
        const couple = await this.coupleService.getMyCouple(userId);
        const room = this.roomForCouple(couple.id);
        const partnerId = couple.user1Id === userId ? couple.user2Id : couple.user1Id;

        if (partnerId) {
            this.server.to(room).emit("live_boost_off", {
                targetUserId: partnerId,
                viewerId: userId
            });
        }

        client.leave(room);
        return { event: "location:left", data: { coupleId: couple.id } };
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage("location:update")
    async handleLocationUpdate(
        @ConnectedSocket() client: AuthSocket,
        @MessageBody() data: UpdateRealtimeLocationDto
    ) {
        const userId = this.getCurrentUserId(client);
        const couple = await this.coupleService.getMyCouple(userId);
        const room = this.roomForCouple(couple.id);

        const snapshot = await this.locationService.updateLocation(userId, data);
        this.server.to(room).emit("partner_location", {
            userId,
            ...snapshot
        });

        return snapshot;
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage("status:heartbeat")
    async handleHeartbeat(@ConnectedSocket() client: AuthSocket, @MessageBody() data: HeartbeatDto) {
        const userId = this.getCurrentUserId(client);
        const couple = await this.coupleService.getMyCouple(userId);
        const room = this.roomForCouple(couple.id);

        const status = await this.locationService.heartbeat(userId, data);
        this.server.to(room).emit("partner_status_changed", status);
        return status;
    }

    private roomForCouple(coupleId: string) {
        return `couple:${coupleId}`;
    }

    private getCurrentUserId(client: AuthSocket) {
        const userId = client.user?.sub || client.user?.id || client.user?.user_Id;
        if (!userId) {
            throw new WsException("Unauthorized");
        }
        return userId;
    }
}
