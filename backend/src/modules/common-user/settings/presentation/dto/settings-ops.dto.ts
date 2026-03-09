import { ApiProperty } from "@nestjs/swagger";

export class SettingsResponseDto {
    @ApiProperty({
        description: "Settings id",
        example: "ea8b6ba0-8fbf-4f8c-8b89-3ba6dad2f77a"
    })
    id: string;

    @ApiProperty({
        description: "Owner user id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    userId: string;

    @ApiProperty({
        description: "Whether notifications are enabled",
        example: true
    })
    notificationEnabled: boolean;

    @ApiProperty({
        description: "Theme mode",
        enum: ["light", "dark", "system"],
        example: "system"
    })
    theme: string;

    @ApiProperty({
        description: "Privacy mode",
        enum: ["public", "friends", "private"],
        example: "friends"
    })
    privacy: string;

    @ApiProperty({
        description: "Updated time (ISO-8601)",
        example: "2026-03-09T08:00:00.000Z"
    })
    updatedAt: string;
}
