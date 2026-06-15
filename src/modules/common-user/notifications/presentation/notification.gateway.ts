import { Logger, UseGuards } from "@nestjs/common";
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { WsJwtGuard } from "../../auth/infrastructure/strategies/ws-jwt.guard";
import {
  NOTIFICATION_SOCKET_EVENTS,
  NOTIFICATION_SOCKET_ROOM_PREFIX,
} from "./constants/notification-realtime.constants";

type AuthSocket = Socket & {
  user?: { sub?: string; id?: string; user_Id?: string };
};

type NotificationEventPayload = {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: string | null;
  data?: Record<string, string>;
  createdAt: string;
};

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(NOTIFICATION_SOCKET_EVENTS.join)
  async joinRoom(@ConnectedSocket() client: AuthSocket) {
    const userId = this.getCurrentUserId(client);
    const room = this.roomForUser(userId);

    await client.join(room);

    this.logger.log(`Client ${client.id} joined room: ${room}`);

    return {
      event: NOTIFICATION_SOCKET_EVENTS.joined,
      data: { room },
    };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(NOTIFICATION_SOCKET_EVENTS.leave)
  async leaveRoom(@ConnectedSocket() client: AuthSocket) {
    const userId = this.getCurrentUserId(client);
    const room = this.roomForUser(userId);

    await client.leave(room);

    this.logger.log(`Client ${client.id} left room: ${room}`);

    return {
      event: NOTIFICATION_SOCKET_EVENTS.left,
      data: { room },
    };
  }
  emitNewNotification(userId: string, notification: NotificationEventPayload) {
    this.server.to(this.roomForUser(userId)).emit(NOTIFICATION_SOCKET_EVENTS.created, notification);
  }

  private roomForUser(userId: string) {
    return `${NOTIFICATION_SOCKET_ROOM_PREFIX}${userId}`;
  }

  private getCurrentUserId(client: AuthSocket) {
    const userId = client.user?.sub || client.user?.id || client.user?.user_Id;
    if (!userId) {
      throw new WsException("Unauthorized");
    }
    return userId;
  }
}
