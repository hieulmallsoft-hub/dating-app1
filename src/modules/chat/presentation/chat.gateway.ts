import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { ChatService } from '../application/chat.service';
import { SendMessageDto } from '../presentation/dto/send-message.dto';
import { WsJwtGuard } from '../../auth/infrastructure/strategies/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('ChatGateway');
  private userSockets = new Map<string, string>(); // userId -> socketId

  constructor(private readonly chatService: ChatService) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Handle presence update logic here
  }

  @SubscribeMessage('join')
  async handleJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: string }) {
    this.userSockets.set(data.userId, client.id);
    this.logger.log(`User ${data.userId} joined with socket ${client.id}`);
    return { event: 'joined', data: { success: true } };
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto & { userId: string },
  ) {
    const savedMessage = await this.chatService.saveMessage(data.userId, data);
    
    // Broadcast to the couple (in a real app, use rooms)
    // For simplicity, we emit to everyone or find the partner's socket
    this.server.emit('message:received', savedMessage);
    return savedMessage;
  }
}
