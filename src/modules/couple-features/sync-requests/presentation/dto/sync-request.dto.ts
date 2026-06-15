import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SyncRequestStatus } from "../../domain/entities/sync-request.entity";

export class CreateSyncRequestDto {
    @ApiPropertyOptional({
        description: "Optional note for partner device",
        example: "May moi can khoi phuc du lieu local"
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    note?: string;

    @ApiPropertyOptional({
        description: "Hours before this request expires. Server clamps this to 1-168 hours.",
        example: 72,
        minimum: 1,
        maximum: 168
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(168)
    expiresInHours?: number;
}

export class SyncRequestResponseDto {
    @ApiProperty({
        description: "Sync request id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    id: string;

    @ApiProperty({
        description: "Couple id",
        example: "9fbc526f-9d1a-4141-b377-53e5fb6a0b69"
    })
    coupleId: string;

    @ApiProperty({
        description: "User who needs to restore data",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    requesterId: string;

    @ApiProperty({
        description: "Partner user who should upload the zip",
        example: "2a5a3a9d-826d-4686-a506-11e7d0c889bc"
    })
    providerId: string;

    @ApiProperty({
        description: "Request status",
        enum: SyncRequestStatus,
        example: SyncRequestStatus.PENDING
    })
    status: SyncRequestStatus;

    @ApiPropertyOptional({
        description: "Optional note",
        example: "May moi can khoi phuc du lieu local",
        nullable: true
    })
    note?: string | null;

    @ApiPropertyOptional({
        description: "Uploaded zip original file name",
        example: "dating-backup.zip",
        nullable: true
    })
    originalFileName?: string | null;

    @ApiPropertyOptional({
        description: "Uploaded zip MIME type",
        example: "application/zip",
        nullable: true
    })
    mimeType?: string | null;

    @ApiPropertyOptional({
        description: "Uploaded zip size in bytes",
        example: 1048576,
        nullable: true
    })
    fileSize?: number | null;

    @ApiPropertyOptional({
        description: "Upload timestamp",
        example: "2026-06-08T03:00:00.000Z",
        nullable: true
    })
    uploadedAt?: string | null;

    @ApiPropertyOptional({
        description: "Download timestamp",
        example: "2026-06-08T03:05:00.000Z",
        nullable: true
    })
    downloadedAt?: string | null;

    @ApiPropertyOptional({
        description: "Confirm timestamp",
        example: "2026-06-08T03:10:00.000Z",
        nullable: true
    })
    confirmedAt?: string | null;

    @ApiPropertyOptional({
        description: "Payload deletion timestamp",
        example: "2026-06-08T03:10:00.000Z",
        nullable: true
    })
    payloadDeletedAt?: string | null;

    @ApiPropertyOptional({
        description: "Expiration timestamp",
        example: "2026-06-11T03:00:00.000Z",
        nullable: true
    })
    expiresAt?: string | null;

    @ApiProperty({
        description: "Created timestamp",
        example: "2026-06-08T03:00:00.000Z"
    })
    createdAt: string;

    @ApiProperty({
        description: "Updated timestamp",
        example: "2026-06-08T03:00:00.000Z"
    })
    updatedAt: string;
}

export class SyncRequestListResponseDto {
    @ApiProperty({
        description: "Sync requests",
        type: () => [SyncRequestResponseDto]
    })
    items: SyncRequestResponseDto[];
}

export class SyncRequestActionResponseDto extends SyncRequestResponseDto {
    @ApiProperty({
        description: "Action success flag",
        example: true
    })
    success: boolean;
}
