import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class MediaItemResponseDto {
    @ApiProperty({
        description: "Media id",
        example: "61a87f8d-22d9-44ad-a1f0-df7898bc513c"
    })
    id: string;

    @ApiProperty({
        description: "Couple id",
        example: "9fbc526f-9d1a-4141-b377-53e5fb6a0b69"
    })
    coupleId: string;

    @ApiProperty({
        description: "Uploader user id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    uploaderId: string;

    @ApiProperty({
        description: "Media URL",
        example: "https://cdn.example.com/media/photo-1.jpg"
    })
    url: string;

    @ApiPropertyOptional({
        description: "Thumbnail URL",
        example: "https://cdn.example.com/media/photo-1-thumb.jpg",
        nullable: true
    })
    thumbUrl?: string | null;

    @ApiPropertyOptional({
        description: "Caption",
        example: "Our weekend memory",
        nullable: true
    })
    caption?: string | null;

    @ApiProperty({
        description: "Media type",
        enum: ["image", "video"],
        example: "image"
    })
    type: "image" | "video";

    @ApiPropertyOptional({
        description: "Optional download URL",
        example: "https://cdn.example.com/media/download/photo-1.jpg",
        nullable: true
    })
    downloadUrl?: string | null;

    @ApiProperty({
        description: "Visibility",
        enum: ["couple_only", "friends", "public"],
        example: "couple_only"
    })
    visibility: "couple_only" | "friends" | "public";

    @ApiProperty({
        description: "Processing status",
        enum: ["processing", "active", "flagged", "synced"],
        example: "active"
    })
    status: "processing" | "active" | "flagged" | "synced";

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

export class MediaAlbumResponseDto {
    @ApiProperty({
        description: "Media items",
        type: () => MediaItemResponseDto,
        isArray: true
    })
    items: MediaItemResponseDto[];

    @ApiPropertyOptional({
        description: "Cursor for next page",
        example: "2026-03-09T08:00:00.000Z|61a87f8d-22d9-44ad-a1f0-df7898bc513c",
        nullable: true
    })
    nextCursor?: string | null;
}

export class MediaChangesResponseDto {
    @ApiProperty({
        description: "Whether there is a new change event",
        example: true
    })
    changed: boolean;

    @ApiProperty({
        description: "Current version",
        example: 12
    })
    version: number;

    @ApiPropertyOptional({
        description: "Couple id when changed=true",
        example: "9fbc526f-9d1a-4141-b377-53e5fb6a0b69",
        nullable: true
    })
    coupleId?: string;

    @ApiPropertyOptional({
        description: "Change type when changed=true",
        enum: ["created", "updated", "deleted"],
        example: "created",
        nullable: true
    })
    type?: "created" | "updated" | "deleted";

    @ApiPropertyOptional({
        description: "Changed media id when changed=true",
        example: "61a87f8d-22d9-44ad-a1f0-df7898bc513c",
        nullable: true
    })
    mediaId?: string;

    @ApiPropertyOptional({
        description: "Actor user id when changed=true",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8",
        nullable: true
    })
    actorId?: string;

    @ApiPropertyOptional({
        description: "Change time when changed=true",
        example: "2026-03-09T08:00:00.000Z",
        nullable: true
    })
    at?: string;
}

export class MediaDownloadResponseDto {
    @ApiProperty({
        description: "Download URL",
        example: "https://cdn.example.com/file.jpg"
    })
    downloadUrl: string;
}

export class MediaActionResponseDto {
    @ApiProperty({
        description: "Operation result",
        example: true
    })
    success: boolean;
}
