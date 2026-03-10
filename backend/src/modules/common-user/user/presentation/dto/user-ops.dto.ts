import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UserProfileResponseDto {
    @ApiProperty({
        description: "User id (UUID)",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    id: string;

    @ApiProperty({
        description: "User email",
        example: "mobile.user@example.com"
    })
    email: string;

    @ApiPropertyOptional({
        description: "Display name",
        example: "Mobile User",
        nullable: true
    })
    fullName?: string | null;

    @ApiPropertyOptional({
        description: "Gender code: 0=MALE, 1=FEMALE, 2=OTHER",
        type: Number,
        enum: [0, 1, 2],
        example: 1,
        nullable: true
    })
    gender?: 0 | 1 | 2 | null;

    @ApiPropertyOptional({
        description: "Birth date",
        example: "2001-05-07",
        nullable: true
    })
    birthDate?: string | null;

    @ApiPropertyOptional({
        description: "Avatar URL",
        example: "https://cdn.example.com/avatars/me.jpg",
        nullable: true
    })
    avatar?: string | null;

    @ApiPropertyOptional({
        description: "Latitude",
        type: Number,
        example: 10.762622,
        nullable: true
    })
    latitude?: number | null;

    @ApiPropertyOptional({
        description: "Longitude",
        type: Number,
        example: 106.660172,
        nullable: true
    })
    longitude?: number | null;
}

export class UpdateUserLocationResponseDto {
    @ApiProperty({
        description: "Current user id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    userId: string;

    @ApiProperty({
        description: "Latitude",
        type: Number,
        example: 10.762622
    })
    latitude: number;

    @ApiProperty({
        description: "Longitude",
        type: Number,
        example: 106.660172
    })
    longitude: number;

    @ApiPropertyOptional({
        description: "Accuracy (meters)",
        type: Number,
        example: 15,
        nullable: true
    })
    accuracy?: number | null;

    @ApiPropertyOptional({
        description: "Battery percent",
        type: Number,
        example: 82,
        nullable: true
    })
    batteryLevel?: number | null;

    @ApiPropertyOptional({
        description: "Charging status",
        example: false,
        nullable: true
    })
    isCharging?: boolean | null;

    @ApiPropertyOptional({
        description: "Speed (km/h)",
        type: Number,
        example: 12,
        nullable: true
    })
    speed?: number | null;
}

export class UpdateAvatarResponseDto {
    @ApiProperty({
        description: "Updated avatar URL",
        example: "http://localhost:3000/uploads/image/1719999999-a1b2c3.jpg"
    })
    avatar: string;

    @ApiProperty({
        description: "Stored file path key",
        example: "image/1719999999-a1b2c3.jpg"
    })
    fileName: string;

    @ApiProperty({
        description: "Mime type",
        example: "image/jpeg"
    })
    mimeType: string;

    @ApiProperty({
        description: "File size in bytes",
        type: Number,
        example: 153244
    })
    size: number;

    @ApiProperty({
        description: "Updated user profile",
        type: UserProfileResponseDto
    })
    user: UserProfileResponseDto;
}

export class DeleteUserResponseDto {
    @ApiProperty({
        description: "Delete message",
        example: "User deleted successfully"
    })
    message: string;
}
