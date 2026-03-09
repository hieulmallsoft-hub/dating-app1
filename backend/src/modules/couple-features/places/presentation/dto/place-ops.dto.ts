import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, Min, Max, IsInt, IsBoolean } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PlaceType } from "../../domain/entities/place.entity";

export class CreatePlaceDto {
    @ApiProperty({
        description: "Place name",
        example: "Our Home"
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({
        description: "Address text",
        example: "123 Nguyen Trai, District 1"
    })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiPropertyOptional({
        description: "Latitude",
        example: 10.762622,
        minimum: -90,
        maximum: 90
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude?: number;

    @ApiPropertyOptional({
        description: "Longitude",
        example: 106.660172,
        minimum: -180,
        maximum: 180
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude?: number;

    @ApiPropertyOptional({
        description: "Place type",
        enum: PlaceType,
        example: PlaceType.HOME
    })
    @IsOptional()
    @IsEnum(PlaceType)
    placeType?: PlaceType;

    @ApiPropertyOptional({
        description: "Geofence radius in meters",
        example: 200,
        minimum: 50,
        maximum: 2000
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(50)
    @Max(2000)
    radius?: number;

    @ApiPropertyOptional({
        description: "Custom icon resource name",
        example: "ic_place_home"
    })
    @IsOptional()
    @IsString()
    iconResName?: string;

    @ApiPropertyOptional({
        description: "Sync flag from client",
        example: true
    })
    @IsOptional()
    @IsBoolean()
    isSynced?: boolean;

    @ApiPropertyOptional({
        description: "Soft-delete flag from client sync",
        example: false
    })
    @IsOptional()
    @IsBoolean()
    isDeleted?: boolean;
}

export class PlaceSharedByUserResponseDto {
    @ApiProperty({
        description: "User id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    id: string;

    @ApiProperty({
        description: "User email",
        example: "mobile.user@example.com"
    })
    email: string;

    @ApiPropertyOptional({
        description: "User full name",
        example: "Mobile User",
        nullable: true
    })
    fullName?: string | null;

    @ApiPropertyOptional({
        description: "Avatar URL",
        example: "https://cdn.example.com/avatars/me.jpg",
        nullable: true
    })
    avatar?: string | null;
}

export class PlaceResponseDto {
    @ApiProperty({
        description: "Place id",
        example: "f5be8be6-9e27-4e27-9cb0-5a60176f8f7e"
    })
    id: string;

    @ApiProperty({
        description: "Place name",
        example: "Our Home"
    })
    name: string;

    @ApiPropertyOptional({
        description: "Address",
        example: "123 Nguyen Trai, District 1",
        nullable: true
    })
    address?: string | null;

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

    @ApiProperty({
        description: "Place type",
        enum: PlaceType,
        example: PlaceType.HOME
    })
    placeType: PlaceType;

    @ApiProperty({
        description: "Geofence radius in meters",
        example: 200
    })
    radius: number;

    @ApiPropertyOptional({
        description: "Icon resource name",
        example: "ic_place_home",
        nullable: true
    })
    iconResName?: string | null;

    @ApiProperty({
        description: "Sync flag",
        example: true
    })
    isSynced: boolean;

    @ApiProperty({
        description: "Soft delete flag",
        example: false
    })
    isDeleted: boolean;

    @ApiProperty({
        description: "Couple id",
        example: "9fbc526f-9d1a-4141-b377-53e5fb6a0b69"
    })
    coupleId: string;

    @ApiProperty({
        description: "Owner/shared-by user id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    sharedBy: string;

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
        description: "Shared-by user profile",
        type: () => PlaceSharedByUserResponseDto
    })
    sharedByUser?: PlaceSharedByUserResponseDto;
}

export class PlaceSearchResultResponseDto {
    @ApiProperty({
        description: "External place identifier",
        example: "123456789"
    })
    id: string;

    @ApiProperty({
        description: "Place display name",
        example: "Highlands Coffee"
    })
    name: string;

    @ApiPropertyOptional({
        description: "Address text",
        example: "123 Nguyen Hue, District 1, Ho Chi Minh City",
        nullable: true
    })
    address?: string | null;

    @ApiPropertyOptional({
        description: "Latitude",
        type: Number,
        example: 10.775
    })
    latitude?: number | null;

    @ApiPropertyOptional({
        description: "Longitude",
        type: Number,
        example: 106.701
    })
    longitude?: number | null;

    @ApiProperty({
        description: "Detected place type",
        enum: PlaceType,
        example: PlaceType.CAFE
    })
    placeType: PlaceType;

    @ApiProperty({
        description: "Alias of placeType for client compatibility",
        enum: PlaceType,
        example: PlaceType.CAFE
    })
    type: PlaceType;
}

// Backward-compatible re-export for any old imports.
export { UpdatePlaceDto } from "./update-place.dto";
