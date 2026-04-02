import { Transform, Type } from "class-transformer";
import {
    IsString,
    IsOptional,
    IsArray,
    IsBoolean,
    IsNumber,
    Min,
    Max,
    ValidateIf,
    MaxLength
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

function toBoolean(value: unknown) {
    if (typeof value === "boolean") {
        return value;
    }
    if (typeof value !== "string") {
        return value;
    }

    const raw = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(raw)) return true;
    if (["false", "0", "no", "n", "off"].includes(raw)) return false;
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

    @ApiPropertyOptional({
        description: "Latitude for check-in location",
        example: 10.762622,
        minimum: -90,
        maximum: 90
    })
    @ValidateIf((o) => o.lng !== undefined)
    @Type(() => Number)
    @IsNumber()
    @Min(-90)
    @Max(90)
    lat?: number;

    @ApiPropertyOptional({
        description: "Longitude for check-in location",
        example: 106.660172,
        minimum: -180,
        maximum: 180
    })
    @ValidateIf((o) => o.lat !== undefined)
    @Type(() => Number)
    @IsNumber()
    @Min(-180)
    @Max(180)
    lng?: number;

    @ApiPropertyOptional({
        description: "Location name or short label",
        example: "Cafe Terrace"
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    locationName?: string;

    @ApiPropertyOptional({
        description: "Full address text for check-in location",
        example: "2715 Ash Dr. San Jose, South Dakota 83475"
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    locationAddress?: string;
}

export class UpdateMomentDto extends CreateMomentDto {}

export class MomentResponseDto {
    @ApiProperty({
        description: "Moment id",
        example: "d39d4f12-001d-4a61-9776-f34f99ba0813"
    })
    id: string;

    @ApiPropertyOptional({
        description: "Creator display name ready for UI",
        example: "Mai Nguyen"
    })
    creatorName?: string;

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
        description: "Visibility flag (true = only creator can view, false = both in couple can view)",
        type: Boolean,
        example: true
    })
    isPrivate: boolean;

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
