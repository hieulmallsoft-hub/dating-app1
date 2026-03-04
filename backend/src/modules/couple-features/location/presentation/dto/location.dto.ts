import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsNumber, IsOptional, Max, Min } from "class-validator";

export enum PresenceStatus {
    ONLINE = "online",
    BACKGROUND = "background",
    OFFLINE = "offline"
}

export class UpdateRealtimeLocationDto {
    @Type(() => Number)
    @IsNumber()
    @Min(-90)
    @Max(90)
    lat: number;

    @Type(() => Number)
    @IsNumber()
    @Min(-180)
    @Max(180)
    lng: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(5000)
    accuracy?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(100)
    batteryLevel?: number;

    @IsOptional()
    @IsBoolean()
    isCharging?: boolean;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(200)
    speed?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    timestamp?: number;
}

export class HeartbeatDto {
    @IsOptional()
    @IsEnum(PresenceStatus)
    status?: PresenceStatus;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(100)
    batteryLevel?: number;

    @IsOptional()
    @IsBoolean()
    isCharging?: boolean;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(200)
    speed?: number;
}
