import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class RoutePointDto {
    @Type(() => Number)
    @IsNumber()
    lat: number;

    @Type(() => Number)
    @IsNumber()
    lng: number;
}

export class TripSyncItemDto {
    @IsString()
    @IsNotEmpty()
    id: string;

    @Type(() => Number)
    @IsNumber()
    startTime: number;

    @Type(() => Number)
    @IsNumber()
    endTime: number;

    @Type(() => Number)
    @IsNumber()
    distanceKm: number;

    @IsOptional()
    @IsString()
    startAddress?: string;

    @IsOptional()
    @IsString()
    endAddress?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RoutePointDto)
    routePoints: RoutePointDto[];
}

export class TripSyncDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TripSyncItemDto)
    trips: TripSyncItemDto[];
}
