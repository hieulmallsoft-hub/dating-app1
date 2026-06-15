import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LocationSource } from "../../domain/entities/location-history.entity";

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
        description: "User 6-digit account code",
        example: "123456",
        nullable: true
    })
    accountCode?: string | null;

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
        description: "Relationship start date from current active couple",
        example: "2026-03-09",
        nullable: true
    })
    startDate?: string | null;

    @ApiPropertyOptional({
        description: "Last updated time of relationship start date (ISO-8601)",
        example: "2026-03-16T10:12:00.000Z",
        nullable: true
    })
    startDateAt?: string | null;

    @ApiPropertyOptional({
        description: "Avatar URL in response only (backend returns this after upload)",
        example: "https://cdn.example.com/avatars/me.jpg",
        nullable: true
    })
    avatar?: string | null;

    @ApiPropertyOptional({
        description: "Premium subscription status",
        example: true,
        nullable: true
    })
    isPremium?: boolean | null;

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

    @ApiPropertyOptional({
        description: "User 6-digit account code",
        example: "123456",
        nullable: true
    })
    accountCode?: string | null;

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

    @ApiPropertyOptional({
        description: "Last accepted location update time (ISO-8601)",
        example: "2026-05-15T07:20:00.000Z",
        nullable: true
    })
    lastActiveAt?: string | null;
}

export class DeleteUserResponseDto {
    @ApiProperty({
        description: "Delete message",
        example: "User deleted successfully"
    })
    message: string;
}

export class LocationHistoryResponseDto {
    @ApiProperty({
        description: "Location history id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    id: string;

    @ApiProperty({
        description: "User id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    userId: string;

    @ApiProperty({
        description: "Couple id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    coupleId: string;

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
        description: "Speed (km/h)",
        type: Number,
        example: 12,
        nullable: true
    })
    speed?: number | null;

    @ApiPropertyOptional({
        description: "Heading (degrees)",
        type: Number,
        example: 180,
        nullable: true
    })
    heading?: number | null;

    @ApiProperty({
        description: "Recorded time (ISO-8601)",
        example: "2026-06-12T08:00:00.000Z"
    })
    recordedAt: string;

    @ApiProperty({
        description: "Location source",
        enum: LocationSource,
        example: LocationSource.REALTIME
    })
    source: LocationSource;
}
