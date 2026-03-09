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

export class TripResponseDto {
    @ApiProperty({
        description: "Trip id",
        example: "trip_20260309_001"
    })
    id: string;

    @ApiProperty({
        description: "User id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    userId: string;

    @ApiProperty({
        description: "Couple id",
        example: "9fbc526f-9d1a-4141-b377-53e5fb6a0b69"
    })
    coupleId: string;

    @ApiProperty({
        description: "Trip start time (ISO-8601)",
        example: "2026-03-09T08:00:00.000Z"
    })
    startTime: string;

    @ApiProperty({
        description: "Trip end time (ISO-8601)",
        example: "2026-03-09T08:30:00.000Z"
    })
    endTime: string;

    @ApiProperty({
        description: "Distance in km",
        example: 12.4
    })
    distanceKm: number;

    @ApiPropertyOptional({
        description: "Start address",
        example: "1 Nguyen Hue, District 1, HCMC",
        nullable: true
    })
    startAddress?: string | null;

    @ApiPropertyOptional({
        description: "End address",
        example: "2 Hai Trieu, District 1, HCMC",
        nullable: true
    })
    endAddress?: string | null;

    @ApiPropertyOptional({
        description: "Preview route points",
        type: () => RoutePointDto,
        isArray: true,
        nullable: true
    })
    routePreview?: RoutePointDto[] | null;

    @ApiPropertyOptional({
        description: "Full route points (only in detail API)",
        type: () => RoutePointDto,
        isArray: true,
        nullable: true
    })
    routeFull?: RoutePointDto[] | null;

    @ApiProperty({
        description: "Created time (ISO-8601)",
        example: "2026-03-09T08:35:00.000Z"
    })
    createdAt: string;

    @ApiProperty({
        description: "Updated time (ISO-8601)",
        example: "2026-03-09T08:35:00.000Z"
    })
    updatedAt: string;
}

export class TripListResponseDto {
    @ApiProperty({
        description: "Trips data",
        type: () => TripResponseDto,
        isArray: true
    })
    data: TripResponseDto[];

    @ApiProperty({
        description: "Current page",
        example: 1
    })
    page: number;

    @ApiProperty({
        description: "Page size",
        example: 20
    })
    limit: number;

    @ApiProperty({
        description: "Total records",
        example: 42
    })
    total: number;
}

export class TripSyncResponseDto {
    @ApiProperty({
        description: "Operation result",
        example: true
    })
    success: boolean;

    @ApiProperty({
        description: "Number of synced trips",
        example: 2
    })
    count: number;
}
