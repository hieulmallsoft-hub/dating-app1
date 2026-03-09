import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PresignedUploadResponseDto {
    @ApiPropertyOptional({
        description: "Pre-signed upload URL (when feature is enabled)",
        example: "https://storage.example.com/presigned-upload-url"
    })
    uploadUrl?: string;

    @ApiPropertyOptional({
        description: "Public file URL after upload",
        example: "https://cdn.example.com/image/1719999999-a1b2c3.jpg"
    })
    fileUrl?: string;

    @ApiPropertyOptional({
        description: "Stored object key",
        example: "image/1719999999-a1b2c3.jpg"
    })
    fileName?: string;

    @ApiPropertyOptional({
        description: "File type",
        enum: ["image", "video", "voice"],
        example: "image"
    })
    type?: "image" | "video" | "voice";

    @ApiPropertyOptional({
        description: "URL expiration in seconds",
        example: 300
    })
    expiresIn?: number;
}

export class UploadFileResponseDto {
    @ApiProperty({
        description: "Public file URL",
        example: "http://localhost:3000/uploads/image/1719999999-a1b2c3.jpg"
    })
    fileUrl: string;

    @ApiProperty({
        description: "File type inferred by MIME",
        enum: ["image", "video", "voice"],
        example: "image"
    })
    type: "image" | "video" | "voice";

    @ApiProperty({
        description: "Mime type",
        example: "image/jpeg"
    })
    mimeType: string;

    @ApiProperty({
        description: "File size in bytes",
        example: 153244
    })
    size: number;

    @ApiProperty({
        description: "Original uploaded file name",
        example: "avatar.jpg"
    })
    originalName: string;

    @ApiProperty({
        description: "Stored object key",
        example: "image/1719999999-a1b2c3.jpg"
    })
    fileName: string;
}
