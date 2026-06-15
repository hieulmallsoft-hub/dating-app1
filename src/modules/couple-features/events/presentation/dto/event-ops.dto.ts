import { IsString, IsNotEmpty, IsOptional, IsDateString, IsBoolean } from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";

export class CreateEventDto {
    @ApiProperty({
        description: "Event title",
        example: "First date anniversary"
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional({
        description: "Event description",
        example: "Dinner at our favorite restaurant"
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({
        description: "Event date (ISO-8601)",
        example: "2026-03-09T19:00:00.000Z"
    })
    @IsDateString()
    @IsNotEmpty()
    date: string;

    @ApiPropertyOptional({
        description: "Mark as anniversary event",
        example: false
    })
    @IsBoolean()
    @IsOptional()
    isAnniversary?: boolean;
}

export class UpdateEventDto extends PartialType(CreateEventDto) {}

export class EventResponseDto {
    @ApiProperty({
        description: "Event id",
        example: "89e5d37c-1f46-4503-92b2-9221898e7e0b"
    })
    id: string;

    @ApiProperty({
        description: "Event title",
        example: "First date anniversary"
    })
    title: string;

    @ApiPropertyOptional({
        description: "Event description",
        example: "Dinner at our favorite restaurant",
        nullable: true
    })
    description?: string | null;

    @ApiProperty({
        description: "Event date (ISO-8601)",
        example: "2026-03-09T19:00:00.000Z"
    })
    date: string;

    @ApiProperty({
        description: "Anniversary flag",
        example: false
    })
    isAnniversary: boolean;

    @ApiProperty({
        description: "Couple id",
        example: "9fbc526f-9d1a-4141-b377-53e5fb6a0b69"
    })
    coupleId: string;

    @ApiProperty({
        description: "Creator user id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    creatorId: string;

    @ApiProperty({
        description: "Created time (ISO-8601)",
        example: "2026-03-09T08:00:00.000Z"
    })
    createdAt: string;

    @ApiProperty({
        description: "Updated time (ISO-8601)",
        example: "2026-03-09T09:00:00.000Z"
    })
    updatedAt: string;
}

export class EventActionResponseDto {
    @ApiProperty({
        description: "Operation result",
        example: true
    })
    success: boolean;
}
