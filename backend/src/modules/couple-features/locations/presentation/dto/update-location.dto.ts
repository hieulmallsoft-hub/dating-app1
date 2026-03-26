import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min
} from "class-validator";
import { LocationType } from "../../domain/entities/location.entity";

export class UpdateLocationDto {
    @ApiPropertyOptional({
        description: "Location name",
        example: "Our New Home"
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @ApiPropertyOptional({
        description: "Address text",
        example: "456 Le Loi, District 1"
    })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({
        description: "Latitude",
        example: 10.772,
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
        example: 106.67,
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
        description: "Location type",
        enum: LocationType,
        example: LocationType.CAFE
    })
    @IsOptional()
    @IsEnum(LocationType)
    locationType?: LocationType;

    @ApiPropertyOptional({
        description: "Geofence radius in meters",
        example: 300,
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
        example: "ic_location_cafe"
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


    @ApiPropertyOptional({
        description: "Updated timestamp",
        example: "2026-03-09T08:00:00.000Z"
    })
    @IsOptional()
    @Type(() => Date)
    updatedAt: Date;


}
