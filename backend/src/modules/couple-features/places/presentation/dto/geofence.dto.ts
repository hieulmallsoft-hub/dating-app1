import { IsEnum, IsNumber, IsOptional, IsUUID } from "class-validator";
import { Type } from "class-transformer";

export enum GeofenceTransition {
    ENTER = "ENTER",
    EXIT = "EXIT"
}

export class GeofenceEventDto {
    @IsUUID()
    placeId: string;

    @IsEnum(GeofenceTransition)
    transition: GeofenceTransition;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    timestamp?: number;
}
