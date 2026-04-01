import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MessageType } from "../../domain/entities/message.entity";

export class ChatMessageSenderResponseDto {
    @ApiProperty({
        description: "Sender id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    id: string;

    @ApiProperty({
        description: "Sender email",
        example: "mobile.user@example.com"
    })
    email: string;

    @ApiPropertyOptional({
        description: "Sender display name",
        example: "Mobile User",
        nullable: true
    })
    fullName?: string | null;

    @ApiPropertyOptional({
        description: "Sender avatar URL",
        example: "https://cdn.example.com/avatars/me.jpg",
        nullable: true
    })
    avatar?: string | null;
}

export class ChatMessageResponseDto {
    @ApiProperty({
        description: "Message id",
        example: "328c95d9-8fba-4877-831c-d10a8609f3ac"
    })
    id: string;

    @ApiProperty({
        description: "Couple id",
        example: "9fbc526f-9d1a-4141-b377-53e5fb6a0b69"
    })
    coupleId: string;

    @ApiProperty({
        description: "Sender id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    senderId: string;

    @ApiProperty({
        description: "Message type",
        enum: MessageType,
        example: MessageType.TEXT
    })
    type: MessageType;

    @ApiPropertyOptional({
        description: "Message content",
        example: "Anh oi em toi roi",
        nullable: true
    })
    content?: string | null;

    @ApiPropertyOptional({
        description: "Latitude for check-in location",
        example: 10.762622,
        nullable: true
    })
    lat?: number | null;

    @ApiPropertyOptional({
        description: "Longitude for check-in location",
        example: 106.660172,
        nullable: true
    })
    lng?: number | null;

    @ApiPropertyOptional({
        description: "Location name or short label",
        example: "Cafe Terrace",
        nullable: true
    })
    locationName?: string | null;

    @ApiPropertyOptional({
        description: "Full address text for check-in location",
        example: "2715 Ash Dr. San Jose, South Dakota 83475",
        nullable: true
    })
    locationAddress?: string | null;

    @ApiProperty({
        description: "Read flag",
        example: false
    })
    isRead: boolean;

    @ApiProperty({
        description: "Created time (ISO-8601)",
        example: "2026-03-09T08:00:00.000Z"
    })
    createdAt: string;

    @ApiPropertyOptional({
        description: "Sender profile",
        type: () => ChatMessageSenderResponseDto
    })
    sender?: ChatMessageSenderResponseDto;
}

export class ChatActionResponseDto {
    @ApiProperty({
        description: "Operation result",
        example: true
    })
    success: boolean;
}
