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

export class GeofenceEventResponseDto {
    @ApiProperty({
        description: "Operation result",
        example: true
    })
    success: boolean;

    @ApiProperty({
        description: "Partner user id to receive notification",
        example: "cd0b85d4-56a9-4976-bc98-076f1967e172"
    })
    partnerId: string;

    @ApiProperty({
        description: "Place id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    placeId: string;

    @ApiProperty({
        description: "Transition type",
        enum: GeofenceTransition,
        example: GeofenceTransition.ENTER
    })
    transition: GeofenceTransition;

    @ApiProperty({
        description: "Event timestamp in epoch milliseconds",
        example: 1762677600000
    })
    timestamp: number;
}
