import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RoutePointDto {
    @ApiProperty({
        description: "Latitude",
        example: 10.762622
    })
    @Type(() => Number)
    @IsNumber()
    lat: number;

    @ApiProperty({
        description: "Longitude",
        example: 106.660172
    })
    @Type(() => Number)
    @IsNumber()
    lng: number;
}

export class TripSyncItemDto {
    @ApiProperty({
        description: "Client trip id",
        example: "trip_20260309_001"
    })
    @IsString()
    @IsNotEmpty()
    id: string;

    @ApiProperty({
        description: "Trip start time in epoch milliseconds",
        example: 1762676400000
    })
    @Type(() => Number)
    @IsNumber()
    startTime: number;

    @ApiProperty({
        description: "Trip end time in epoch milliseconds",
        example: 1762677600000
    })
    @Type(() => Number)
    @IsNumber()
    endTime: number;

    @ApiProperty({
        description: "Trip distance in kilometers",
        example: 12.4
    })
    @Type(() => Number)
    @IsNumber()
    distanceKm: number;

    @ApiPropertyOptional({
        description: "Start address",
        example: "1 Nguyen Hue, District 1, HCMC"
    })
    @IsOptional()
    @IsString()
    startAddress?: string;

    @ApiPropertyOptional({
        description: "End address",
        example: "2 Hai Trieu, District 1, HCMC"
    })
    @IsOptional()
    @IsString()
    endAddress?: string;

    @ApiProperty({
        description: "Route polyline points",
        type: () => RoutePointDto,
        isArray: true
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RoutePointDto)
    routePoints: RoutePointDto[];
}

export class TripSyncDto {
    @ApiProperty({
        description: "Trips to sync",
        type: () => TripSyncItemDto,
        isArray: true
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TripSyncItemDto)
    trips: TripSyncItemDto[];
}
