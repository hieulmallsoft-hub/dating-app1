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
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../../auth/application/auth.service";
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
  isRead: boolean;
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
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  async handleConnection(client: AuthSocket) {
    this.logger.log(`Client connected: ${client.id}`);

    const userId = await this.tryAuthenticateFromHandshake(client);
    if (!userId) {
      this.logger.debug(
        `Client ${client.id} connected without valid WS auth token; waiting for ${NOTIFICATION_SOCKET_EVENTS.join}`,
      );
      return;
    }

    const room = this.roomForUser(userId);
    await client.join(room);
    this.logger.log(`Client ${client.id} auto-joined room: ${room}`);
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
    const room = this.roomForUser(userId);
    const socketsInRoom = this.getRoomSocketCount(room);

    if (socketsInRoom === 0) {
      this.logger.warn(
        `Emit ${NOTIFICATION_SOCKET_EVENTS.created}: no active socket in room ${room}`,
      );
    } else {
      this.logger.debug(
        `Emit ${NOTIFICATION_SOCKET_EVENTS.created} to room ${room} (sockets=${socketsInRoom})`,
      );
    }

    this.server.to(room).emit(NOTIFICATION_SOCKET_EVENTS.created, notification);
  }

  emitNotificationRead(userId: string, notification: NotificationEventPayload) {
    const room = this.roomForUser(userId);
    const socketsInRoom = this.getRoomSocketCount(room);

    if (socketsInRoom === 0) {
      this.logger.warn(
        `Emit ${NOTIFICATION_SOCKET_EVENTS.read}: no active socket in room ${room}`,
      );
    } else {
      this.logger.debug(
        `Emit ${NOTIFICATION_SOCKET_EVENTS.read} to room ${room} (sockets=${socketsInRoom})`,
      );
    }

    this.server.to(room).emit(NOTIFICATION_SOCKET_EVENTS.read, notification);
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

  private getRoomSocketCount(room: string) {
    return this.server.sockets.adapter.rooms.get(room)?.size ?? 0;
  }

  private async tryAuthenticateFromHandshake(client: AuthSocket) {
    try {
      const token = this.extractToken(client);
      if (!token) return null;

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get("JWT_SECRET"),
      });
      const user = await this.authService.validateAccessTokenPayload(payload);
      client.user = user;

      return user.sub || user.id || user.user_Id || null;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      this.logger.debug(`WS handshake auth skipped for ${client.id}: ${message}`);
      return null;
    }
  }

  private extractToken(client: Socket) {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    const query = client.handshake.query as Record<string, unknown> | undefined;
    const headerAuthorization = client.handshake.headers?.authorization;

    const candidates = [
      this.toStringValue(auth?.token),
      this.toStringValue(auth?.accessToken),
      this.toStringValue(auth?.access_token),
      this.toStringValue(headerAuthorization),
      this.toStringValue(query?.token),
      this.toStringValue(query?.accessToken),
      this.toStringValue(query?.access_token),
    ];

    const rawToken = candidates.find((item) => Boolean(item && item.trim().length > 0));
    if (!rawToken) return null;

    const normalized = rawToken.trim();
    if (normalized.toLowerCase().startsWith("bearer ")) {
      return normalized.slice(7).trim();
    }

    return normalized;
  }

  private toStringValue(value: unknown) {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
      return value[0];
    }
    return null;
  }
}
