import { Module } from "@nestjs/common";

import { TypeOrmModule } from "@nestjs/typeorm";
import { Message } from "./domain/entities/message.entity";
import { ChatService } from "./application/chat.service";
import { MessageRepository } from "./infrastructure/persistence/message.repository";
import { ChatController } from "./presentation/chat.controller";
import { ChatGateway } from "./presentation/chat.gateway";
import { CoupleModule } from "../couple/couple.module";
import { AuthModule } from "../../common-user/auth/auth.module";
import { NotificationsModule } from "../../common-user/notifications/notifications.module";

@Module({
    imports: [TypeOrmModule.forFeature([Message]), CoupleModule, AuthModule, NotificationsModule],
    controllers: [ChatController],
    providers: [ChatService, MessageRepository, ChatGateway],
    exports: [ChatService]
})
export class ChatModule {}


