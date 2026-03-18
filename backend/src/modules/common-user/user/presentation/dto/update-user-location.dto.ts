import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, Max, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateUserLocationDto {
    @ApiProperty({
        description: "Latitude",
        example: 10.762622,
        minimum: -90,
        maximum: 90
    })
    @Type(() => Number)
    @IsNumber()
    @Min(-90)
    @Max(90)
    lat: number;

    @ApiProperty({
        description: "Longitude",
        example: 106.660172,
        minimum: -180,
        maximum: 180
    })
    @Type(() => Number)
    @IsNumber()
    @Min(-180)
    @Max(180)
    lng: number;

    @ApiPropertyOptional({
        description: "GPS accuracy in meters",
        example: 15,
        minimum: 0,
        maximum: 5000
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(5000)
    accuracy?: number;

    @ApiPropertyOptional({
        description: "Battery level percent",
        example: 82,
        minimum: 0,
        maximum: 100
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(100)
    batteryLevel?: number;

    @ApiPropertyOptional({
        description: "Whether device is charging",
        example: false
    })
    @IsOptional()
    @IsBoolean()
    isCharging?: boolean;

    @ApiPropertyOptional({
        description: "Speed in km/h",
        example: 12,
        minimum: 0,
        maximum: 200
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(200)
    speed?: number;

    @ApiPropertyOptional({
        description: "Client event time in epoch milliseconds (UTC)",
        example: 1762677600000,
        minimum: 0
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    timestamp?: number;
}
