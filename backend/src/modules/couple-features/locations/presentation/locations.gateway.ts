import { UseGuards } from "@nestjs/common";
import {
    ConnectedSocket,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    WsException
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { WsJwtGuard } from "../../../common-user/auth/infrastructure/strategies/ws-jwt.guard";
import { CoupleService } from "../../couple/application/couple.service";

export type LocationsRealtimeEvent = "locations:created" | "locations:updated" | "locations:deleted";

@WebSocketGateway({
    cors: {
        origin: "*"
    }
})
export class LocationsGateway {
    @WebSocketServer()
    server: Server;

    constructor(private readonly coupleService: CoupleService) {}

    @UseGuards(WsJwtGuard)
    @SubscribeMessage("locations:join")
    async handleJoin(@ConnectedSocket() client: Socket & { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = this.getCurrentUserId(client);
        const couple = await this.coupleService.getMyCouple(userId);
        const room = this.roomForCouple(couple.id);
        await client.join(room);
        return { event: "locations:joined", data: { coupleId: couple.id } };
    }

    emitToCouple(coupleId: string, event: LocationsRealtimeEvent, payload: unknown) {
        if (!this.server) return;
        this.server.to(this.roomForCouple(coupleId)).emit(event, payload);
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
}
