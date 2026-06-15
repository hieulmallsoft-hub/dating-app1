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
import { WebRtcSignalingStateService } from "../application/webrtc-signaling-state.service";
import { NotificationsService } from "../../../common-user/notifications/application/notifications.service";
import { NotificationType } from "../../../common-user/notifications/domain/entities/notification.entity";

type AuthSocket = Socket & {
    user?: { sub?: string; id?: string; user_Id?: string };
};

type WebRtcSignalEvent =
    | "webrtc:offer"
    | "webrtc:answer"
    | "webrtc:ice-candidate"
    | "webrtc:cancel"
    | "webrtc:failed"
    | "webrtc:ack";

type WebRtcSignalPayload = {
    sessionId?: string;
    toUserId?: string;
    sdp?: unknown;
    candidate?: unknown;
    messageId?: string;
    transferId?: string;
    file?: {
        name?: string;
        mimeType?: string;
        size?: number;
        sha256?: string;
    };
    reason?: string;
};

@WebSocketGateway({
    cors: {
        origin: "*"
    }
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger("ChatGateway");
    private readonly socketUsers = new Map<string, string>();

    constructor(
        private readonly chatService: ChatService,
        private readonly coupleService: CoupleService,
        private readonly webRtcState: WebRtcSignalingStateService,
        private readonly notificationsService: NotificationsService
    ) {}

    async handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        void this.removeOnlineSocket(client);
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

    @UseGuards(WsJwtGuard)
    @SubscribeMessage("webrtc:join")
    async handleWebRtcJoin(@ConnectedSocket() client: AuthSocket, @MessageBody() _data: unknown) {
        const userId = this.getCurrentUserId(client);
        const couple = await this.coupleService.getMyCouple(userId);
        const partnerId = this.getPartnerId(couple, userId);

        await this.markOnline(client, userId);
        client.join(this.roomForUser(userId));
        client.join(this.roomForCouple(couple.id));

        const payload = {
            success: true,
            userId,
            coupleId: couple.id,
            partnerId,
            partnerOnline: partnerId ? await this.webRtcState.isOnline(partnerId) : false,
            presenceTtlSeconds: this.webRtcState.getPresenceTtlSeconds()
        };

        if (partnerId) {
            this.server.to(this.roomForUser(partnerId)).emit("webrtc:presence", {
                userId,
                coupleId: couple.id,
                online: true,
                at: new Date().toISOString()
            });
        }

        return { event: "webrtc:joined", data: payload };
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage("webrtc:presence:get")
    async handleWebRtcPresenceGet(@ConnectedSocket() client: AuthSocket) {
        const userId = this.getCurrentUserId(client);
        const couple = await this.coupleService.getMyCouple(userId);
        const partnerId = this.getPartnerId(couple, userId);

        await this.markOnline(client, userId);

        return {
            event: "webrtc:presence",
            data: {
                userId: partnerId,
                coupleId: couple.id,
                online: partnerId ? await this.webRtcState.isOnline(partnerId) : false,
                at: new Date().toISOString()
            }
        };
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage("webrtc:heartbeat")
    async handleWebRtcHeartbeat(@ConnectedSocket() client: AuthSocket) {
        const userId = this.getCurrentUserId(client);
        const couple = await this.coupleService.getMyCouple(userId);
        const partnerId = this.getPartnerId(couple, userId);

        await this.markOnline(client, userId);
        client.join(this.roomForUser(userId));

        return {
            event: "webrtc:heartbeat:ack",
            data: {
                ok: true,
                ttlSeconds: this.webRtcState.getPresenceTtlSeconds(),
                partnerOnline: partnerId ? await this.webRtcState.isOnline(partnerId) : false
            }
        };
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage("webrtc:offer")
    async handleWebRtcOffer(@ConnectedSocket() client: AuthSocket, @MessageBody() payload: WebRtcSignalPayload) {
        return this.forwardWebRtcSignal(client, "webrtc:offer", payload);
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage("webrtc:answer")
    async handleWebRtcAnswer(@ConnectedSocket() client: AuthSocket, @MessageBody() payload: WebRtcSignalPayload) {
        return this.forwardWebRtcSignal(client, "webrtc:answer", payload);
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage("webrtc:ice-candidate")
    async handleWebRtcIceCandidate(
        @ConnectedSocket() client: AuthSocket,
        @MessageBody() payload: WebRtcSignalPayload
    ) {
        return this.forwardWebRtcSignal(client, "webrtc:ice-candidate", payload);
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage("webrtc:cancel")
    async handleWebRtcCancel(@ConnectedSocket() client: AuthSocket, @MessageBody() payload: WebRtcSignalPayload) {
        return this.forwardWebRtcSignal(client, "webrtc:cancel", payload, { allowOffline: true });
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage("webrtc:failed")
    async handleWebRtcFailed(@ConnectedSocket() client: AuthSocket, @MessageBody() payload: WebRtcSignalPayload) {
        return this.forwardWebRtcSignal(client, "webrtc:failed", payload, { allowOffline: true });
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage("webrtc:ack")
    async handleWebRtcAck(@ConnectedSocket() client: AuthSocket, @MessageBody() payload: WebRtcSignalPayload) {
        return this.forwardWebRtcSignal(client, "webrtc:ack", payload, { allowOffline: true });
    }

    @SubscribeMessage("message:send")
    async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() data: SendMessageDto) {
        const userId = this.getCurrentUserId(client);
        const savedMessage = await this.chatService.saveMessage(userId, data);
        const response = toChatMessageResponse(savedMessage);

        this.server.to(this.roomForCouple(savedMessage.coupleId)).emit("message:received", response);
        return response;
    }

    private async forwardWebRtcSignal(
        client: AuthSocket,
        event: WebRtcSignalEvent,
        payload: WebRtcSignalPayload,
        options: { allowOffline?: boolean } = {}
    ) {
        const userId = this.getCurrentUserId(client);
        const couple = await this.coupleService.getMyCouple(userId);
        const partnerId = this.getPartnerId(couple, userId);
        const targetUserId = payload?.toUserId || partnerId;

        await this.markOnline(client, userId);

        if (!partnerId || !targetUserId || targetUserId !== partnerId) {
            throw new WsException("Invalid WebRTC target");
        }

        const rateLimit = await this.checkWebRtcSignalLimit(userId, event, payload);
        if (!rateLimit.allowed) {
            return {
                event: `${event}:result`,
                data: {
                    success: false,
                    reason: rateLimit.reason,
                    sessionId: payload?.sessionId ?? null,
                    toUserId: targetUserId
                }
            };
        }

        const targetOnline = await this.webRtcState.isOnline(targetUserId);
        if (!targetOnline && !options.allowOffline) {
            if (event === "webrtc:offer") {
                await this.notifyPartnerForPendingWebRtcTransfer(targetUserId, userId, payload);
            }

            return {
                event: `${event}:result`,
                data: {
                    success: false,
                    reason: "partner_offline",
                    sessionId: payload?.sessionId ?? null,
                    toUserId: targetUserId
                }
            };
        }

        const signal = {
            ...this.sanitizeSignalPayload(payload),
            fromUserId: userId,
            toUserId: targetUserId,
            coupleId: couple.id,
            at: new Date().toISOString()
        };

        this.server.to(this.roomForUser(targetUserId)).emit(event, signal);
        await this.closeFinishedWebRtcSession(event, userId, targetUserId, payload?.sessionId);

        return {
            event: `${event}:result`,
            data: {
                success: true,
                deliveredToSocket: targetOnline,
                sessionId: payload?.sessionId ?? null,
                toUserId: targetUserId
            }
        };
    }

    private async checkWebRtcSignalLimit(userId: string, event: WebRtcSignalEvent, payload: WebRtcSignalPayload = {}) {
        const sessionId = this.toOptionalString(payload.sessionId, 120);

        if (event === "webrtc:ice-candidate") {
            const bucket = `ice:${userId}:${sessionId || "global"}`;
            const allowed = await this.webRtcState.consumeRateLimit(bucket, 60, 1);
            return allowed ? { allowed: true } : { allowed: false, reason: "rate_limited" };
        }

        if (event === "webrtc:offer") {
            const offerBucket = `offer:${userId}:${sessionId || "global"}`;
            const offerAllowed = await this.webRtcState.consumeRateLimit(offerBucket, 3, 60);
            if (!offerAllowed) {
                return { allowed: false, reason: "rate_limited" };
            }

            if (sessionId) {
                const sessionAllowed = await this.webRtcState.openSession(userId, sessionId);
                if (!sessionAllowed) {
                    return { allowed: false, reason: "too_many_sessions" };
                }
            }

            return { allowed: true };
        }

        const controlBucket = `control:${event}:${userId}`;
        const allowed = await this.webRtcState.consumeRateLimit(controlBucket, 30, 60);
        return allowed ? { allowed: true } : { allowed: false, reason: "rate_limited" };
    }

    private async closeFinishedWebRtcSession(
        event: WebRtcSignalEvent,
        userId: string,
        targetUserId: string,
        sessionId?: string
    ) {
        const cleanSessionId = this.toOptionalString(sessionId, 120);
        if (!cleanSessionId || !["webrtc:cancel", "webrtc:failed", "webrtc:ack"].includes(event)) {
            return;
        }

        await Promise.all([
            this.webRtcState.closeSession(userId, cleanSessionId),
            this.webRtcState.closeSession(targetUserId, cleanSessionId)
        ]);
    }

    private sanitizeSignalPayload(payload: WebRtcSignalPayload = {}) {
        return {
            sessionId: this.toOptionalString(payload.sessionId, 120),
            sdp: payload.sdp,
            candidate: payload.candidate,
            messageId: this.toOptionalString(payload.messageId, 120),
            transferId: this.toOptionalString(payload.transferId, 120),
            file: this.sanitizeFileMetadata(payload.file),
            reason: this.toOptionalString(payload.reason, 500)
        };
    }

    private sanitizeFileMetadata(file?: WebRtcSignalPayload["file"]) {
        if (!file || typeof file !== "object") return undefined;
        return {
            name: this.toOptionalString(file.name, 255),
            mimeType: this.toOptionalString(file.mimeType, 120),
            size: typeof file.size === "number" && Number.isFinite(file.size) ? Math.max(0, Math.floor(file.size)) : undefined,
            sha256: this.toOptionalString(file.sha256, 128)
        };
    }

    private toOptionalString(value: unknown, maxLength: number) {
        if (typeof value !== "string") return undefined;
        const clean = value.trim();
        return clean ? clean.slice(0, maxLength) : undefined;
    }

    private async markOnline(client: Socket, userId: string) {
        this.socketUsers.set(client.id, userId);
        await this.webRtcState.markOnline(userId, client.id);
    }

    private async removeOnlineSocket(client: Socket) {
        const userId = this.socketUsers.get(client.id);
        if (!userId) return;

        this.socketUsers.delete(client.id);
        const stillOnline = await this.webRtcState.markOffline(userId, client.id);
        if (stillOnline) return;

        try {
            const couple = await this.coupleService.getMyCouple(userId);
            const partnerId = this.getPartnerId(couple, userId);
            if (partnerId) {
                this.server.to(this.roomForUser(partnerId)).emit("webrtc:presence", {
                    userId,
                    coupleId: couple.id,
                    online: false,
                    at: new Date().toISOString()
                });
            }
        } catch (error) {
            this.logger.warn(`Emit WebRTC offline presence failed: ${(error as Error)?.message || "unknown"}`);
        }
    }

    private async notifyPartnerForPendingWebRtcTransfer(
        partnerId: string,
        senderId: string,
        payload: WebRtcSignalPayload = {}
    ) {
        const file = this.sanitizeFileMetadata(payload.file);
        const isImage = typeof file?.mimeType === "string" && file.mimeType.toLowerCase().startsWith("image/");
        const title = "Tin nhan moi";
        const content = isImage ? "Ban co anh dang cho nhan" : "Ban co file dang cho nhan";
        const notificationType = isImage ? NotificationType.CHAT_IMAGE : NotificationType.CHAT;
        const data = this.compactStringData({
            action: "webrtc_transfer_pending",
            fromUserId: senderId,
            sessionId: this.toOptionalString(payload.sessionId, 120),
            transferId: this.toOptionalString(payload.transferId, 120),
            messageId: this.toOptionalString(payload.messageId, 120),
            fileName: file?.name,
            mimeType: file?.mimeType,
            size: typeof file?.size === "number" ? String(file.size) : undefined
        });

        try {
            await this.notificationsService.createNotification(partnerId, title, content, notificationType, data);
        } catch (error) {
            this.logger.warn(`Create WebRTC pending notification failed: ${(error as Error)?.message || "unknown"}`);
        }
    }

    private compactStringData(data: Record<string, string | undefined>) {
        return Object.fromEntries(Object.entries(data).filter(([, value]) => typeof value === "string")) as Record<
            string,
            string
        >;
    }

    private getPartnerId(couple: { user1Id: string; user2Id: string | null }, userId: string) {
        return couple.user1Id === userId ? couple.user2Id : couple.user1Id;
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

    private roomForUser(userId: string) {
        return `webrtc:user:${userId}`;
    }
}



