import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

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

    @ApiPropertyOptional({
        description: "Notification type",
        example: "chat",
        nullable: true
    })
    type?: string | null;

    @ApiProperty({
        description: "Read status",
        example: false
    })
    isRead: boolean;

    @ApiProperty({
        description: "Created time (ISO-8601)",
        example: "2026-03-09T08:00:00.000Z"
    })
    createdAt: string;
}

export class CreateTestNotificationDto {
    @ApiPropertyOptional({
        description: "Test title",
        example: "Test notification"
    })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({
        description: "Test content",
        example: "Created from Swagger"
    })
    @IsOptional()
    @IsString()
    content?: string;

    @ApiPropertyOptional({
        description: "Test type",
        example: "test"
    })
    @IsOptional()
    @IsString()
    type?: string;
}
