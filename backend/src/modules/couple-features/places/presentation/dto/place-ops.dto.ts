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

// Backward-compatible re-export for any old imports.
export { UpdatePlaceDto } from "./update-place.dto";
