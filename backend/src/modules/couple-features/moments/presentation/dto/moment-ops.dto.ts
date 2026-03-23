import { Transform } from "class-transformer";
import { IsString, IsOptional, IsArray, IsBoolean } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

function toBoolean(value: unknown) {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
}

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
        description: "Visibility flag (true = only creator can view, false = both in couple can view)",
        type: Boolean,
        example: true
    })
    @Transform(({ value }) => toBoolean(value))
    @IsBoolean()
    @IsOptional()
    isPrivate?: boolean;

    @ApiPropertyOptional({
        description: "Deprecated alias of isPrivate",
        type: Boolean,
        example: true,
        deprecated: true
    })
    @Transform(({ value }) => toBoolean(value))
    @IsBoolean()
    @IsOptional()
    privacy?: boolean;
}

export class UpdateMomentDto extends CreateMomentDto {}

export class MomentCreatorResponseDto {
    @ApiProperty({
        description: "Creator user id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    id: string;

    @ApiProperty({
        description: "Creator email",
        example: "mobile.user@example.com"
    })
    email: string;

    @ApiPropertyOptional({
        description: "Creator display name",
        example: "Mai Nguyen",
        nullable: true
    })
    fullName?: string | null;

    @ApiPropertyOptional({
        description: "Creator avatar URL",
        example: "https://cdn.example.com/avatars/me.jpg",
        nullable: true
    })
    avatar?: string | null;
}

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
        description: "Creator display name ready for UI",
        example: "Mai Nguyen"
    })
    creatorName?: string;

    @ApiPropertyOptional({
        description: "Creator role relative to current user",
        example: "ME"
    })
    creatorRole?: "ME" | "PARTNER";

    @ApiPropertyOptional({
        description: "True if current authenticated user can update this moment (owner post)",
        example: true
    })
    isUpdate?: boolean;

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
        description: "Visibility flag (true = only creator can view, false = both in couple can view)",
        type: Boolean,
        example: true
    })
    isPrivate: boolean;

    @ApiPropertyOptional({
        description: "Deprecated alias of isPrivate",
        type: Boolean,
        example: true,
        deprecated: true
    })
    privacy?: boolean;

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

    @ApiPropertyOptional({
        description: "Creator profile",
        type: () => MomentCreatorResponseDto
    })
    creator?: MomentCreatorResponseDto;
}

export class MomentActionResponseDto {
    @ApiProperty({
        description: "Operation result",
        example: true
    })
    success: boolean;
}
