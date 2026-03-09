import { IsString, IsOptional, IsArray, IsEnum, IsNotEmpty } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MomentPrivacy } from "../../domain/entities/moment.entity";

export class CreateMomentDto {
    @ApiPropertyOptional({
        description: "Moment text content",
        example: "Today was a beautiful day together."
    })
    @IsString()
    @IsOptional()
    content?: string;

    @ApiPropertyOptional({
        description: "Photo URLs",
        type: [String],
        example: ["https://cdn.example.com/photos/1.jpg", "https://cdn.example.com/photos/2.jpg"]
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    photos?: string[];

    @ApiPropertyOptional({
        description: "Visibility of moment",
        enum: MomentPrivacy,
        example: MomentPrivacy.COUPLE
    })
    @IsEnum(MomentPrivacy)
    @IsOptional()
    privacy?: MomentPrivacy;
}

export class UpdateMomentDto extends CreateMomentDto {}

export class MomentResponseDto {
    @ApiProperty({
        description: "Moment id",
        example: "d39d4f12-001d-4a61-9776-f34f99ba0813"
    })
    id: string;

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

    @ApiPropertyOptional({
        description: "Moment content",
        example: "Today was a beautiful day together.",
        nullable: true
    })
    content?: string | null;

    @ApiPropertyOptional({
        description: "Photo URLs",
        type: [String],
        example: ["https://cdn.example.com/photos/1.jpg"],
        nullable: true
    })
    photos?: string[] | null;

    @ApiProperty({
        description: "Privacy option",
        enum: MomentPrivacy,
        example: MomentPrivacy.COUPLE
    })
    privacy: MomentPrivacy;

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

export class MomentActionResponseDto {
    @ApiProperty({
        description: "Operation result",
        example: true
    })
    success: boolean;
}
