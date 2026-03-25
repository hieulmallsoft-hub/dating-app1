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

export type PlacesRealtimeEvent = "places:created" | "places:updated" | "places:deleted";

@WebSocketGateway({
    cors: {
        origin: "*"
    }
})
export class PlacesGateway {
    @WebSocketServer()
    server: Server;

    constructor(private readonly coupleService: CoupleService) {}

    @UseGuards(WsJwtGuard)
    @SubscribeMessage("places:join")
    async handleJoin(@ConnectedSocket() client: Socket & { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = this.getCurrentUserId(client);
        const couple = await this.coupleService.getMyCouple(userId);
        const room = this.roomForCouple(couple.id);
        await client.join(room);
        return { event: "places:joined", data: { coupleId: couple.id } };
    }

    emitToCouple(coupleId: string, event: PlacesRealtimeEvent, payload: unknown) {
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
