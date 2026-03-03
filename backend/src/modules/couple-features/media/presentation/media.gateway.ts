import { Logger, UseGuards } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { WsJwtGuard } from "../../../common-user/auth/infrastructure/strategies/ws-jwt.guard";
import { CoupleService } from "../../couple/application/couple.service";
import { MediaChangeEvent } from "../application/media-realtime.service";

type AuthSocket = Socket & {
  user?: { sub?: string; id?: string; user_Id?: string };
};

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class MediaGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MediaGateway.name);

  constructor(private readonly coupleService: CoupleService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("album:join")
  async handleAlbumJoin(@ConnectedSocket() client: AuthSocket, @MessageBody() _body: unknown) {
    const userId = this.getCurrentUserId(client);
    const couple = await this.coupleService.getMyCouple(userId);
    const room = this.roomForCouple(couple.id);
    client.join(room);
    return { event: "album:joined", data: { coupleId: couple.id } };
  }

  emitAlbumChanged(event: MediaChangeEvent) {
    this.server.to(this.roomForCouple(event.coupleId)).emit("album:changed", event);
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



