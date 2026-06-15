import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { Transform } from "class-transformer";
import { NotificationType, normalizeNotificationType } from "../../domain/entities/notification.entity";

export class NotificationResponseDto {
    
    @ApiProperty({
        description: "Notification id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    id: string;

    @ApiProperty({
        description: "User id who owns this notification",
        example: "4f8cc6d9-ccf3-4e1e-ae3d-0f23db4be0d7"
    })
    userId: string;

    @ApiProperty({
        description: "Notification title",
        example: "Tin nhan moi"
    })
    title: string;

    @ApiProperty({
        description: "Notification content",
        example: "Doi cua ban vua gui mot tin nhan"
    })
    content: string;

    @ApiProperty({
        description: "Notification type",
        enum: NotificationType,
        example: NotificationType.CHAT
    })
    type: NotificationType;

    @ApiProperty({
        description: "Created time (ISO-8601)",
        example: "2026-03-09T08:00:00.000Z"
    })
    createdAt: string;
}

export class CreateTestNotificationDto {
    @ApiPropertyOptional({
        description: "Target user id to receive notification. If omitted, backend sends to current authenticated user.",
        example: "4f8cc6d9-ccf3-4e1e-ae3d-0f23db4be0d7"
    })
    @IsOptional()
    @IsUUID()
    targetUserId?: string;

    @ApiProperty({
        description: "Notification title",
        example: "Test thong bao"
    })
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    title: string;

    @ApiProperty({
        description: "Notification content",
        example: "Backend test tu Swagger"
    })
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    content: string;

    @ApiPropertyOptional({
        description: "Notification type",
        enum: NotificationType,
        example: NotificationType.TEST
    })
    @Transform(({ value }) => (typeof value === "string" ? normalizeNotificationType(value) : value))
    @IsOptional()
    @IsEnum(NotificationType)
    type?: NotificationType;
}
