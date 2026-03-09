import { IsEnum, IsNumber, IsOptional, IsUUID } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum GeofenceTransition {
    ENTER = "ENTER",
    EXIT = "EXIT"
}

export class GeofenceEventDto {
    @ApiProperty({
        description: "Place id (UUID)",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @IsUUID()
    placeId: string;

    @ApiProperty({
        description: "Transition type",
        enum: GeofenceTransition,
        example: GeofenceTransition.ENTER
    })
    @IsEnum(GeofenceTransition)
    transition: GeofenceTransition;

    @ApiPropertyOptional({
        description: "Event timestamp in epoch milliseconds",
        example: 1762677600000
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    timestamp?: number;
}
