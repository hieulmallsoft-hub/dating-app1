import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
    WsException
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { UseGuards, Logger } from "@nestjs/common";
import { ChatService } from "../application/chat.service";
import { SendMessageDto } from "../presentation/dto/send-message.dto";
import { WsJwtGuard } from "../../../common-user/auth/infrastructure/strategies/ws-jwt.guard";
import { CoupleService } from "../../couple/application/couple.service";
import { toChatMessageResponse } from "./mappers/chat-response.mapper";

@WebSocketGateway({
    cors: {
        origin: "*"
    }
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger("ChatGateway");

    constructor(
        private readonly chatService: ChatService,
        private readonly coupleService: CoupleService
    ) {}

    async handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        // Handle presence update logic here
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage("join")
    async handleJoin(@ConnectedSocket() client: Socket, @MessageBody() _data: unknown) {
        const userId = this.getCurrentUserId(client);
        const couple = await this.coupleService.getMyCouple(userId);
        const room = this.roomForCouple(couple.id);
        client.join(room);
        this.logger.log(`User ${userId} joined room ${room} with socket ${client.id}`);
        return { event: "joined", data: { success: true, coupleId: couple.id } };
    }

    @SubscribeMessage("message:send")
    async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() data: SendMessageDto) {
        const userId = this.getCurrentUserId(client);
        const savedMessage = await this.chatService.saveMessage(userId, data);
        const response = toChatMessageResponse(savedMessage);

        this.server.to(this.roomForCouple(savedMessage.coupleId)).emit("message:received", response);
        return response;
    }

    private getCurrentUserId(client: Socket & { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = client.user?.sub || client.user?.id || client.user?.user_Id;
        if (!userId) {
            throw new WsException("Unauthorized");
        }
        return userId;
    }

    private roomForCouple(coupleId: string) {
        return `couple:${coupleId}`;
    }
}



