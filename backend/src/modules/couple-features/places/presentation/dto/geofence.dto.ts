import { IsEnum, IsNumber, IsOptional, IsUUID } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum GeofenceTransition {
    ENTER = "ENTER",
    EXIT = "EXIT"
}

export class GeofenceEventDto {
    @ApiProperty({
        description:
            "Saved place id from /places list. Mobile geofence should send this place id when transition occurs.",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @IsUUID()
    placeId: string;

    @ApiProperty({
        description: "Geofence transition from OS callback. ENTER=arrived, EXIT=left.",
        enum: GeofenceTransition,
        example: GeofenceTransition.ENTER
    })
    @IsEnum(GeofenceTransition)
    transition: GeofenceTransition;

    @ApiPropertyOptional({
        description:
            "Event time in epoch milliseconds from device. If omitted, backend uses current server time.",
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
        description: "Place id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    placeId: string;

    @ApiProperty({
        description: "Transition accepted by backend",
        enum: GeofenceTransition,
        example: GeofenceTransition.ENTER
    })
    transition: GeofenceTransition;

    @ApiProperty({
        description: "Final event timestamp (epoch milliseconds) used by backend",
        example: 1762677600000
    })
    timestamp: number;
}
