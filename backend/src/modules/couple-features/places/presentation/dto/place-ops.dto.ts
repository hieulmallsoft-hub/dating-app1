import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, Min, Max, IsInt, IsBoolean } from "class-validator";
import { Type } from "class-transformer";
import { PlaceType } from "../../domain/entities/place.entity";

export class CreatePlaceDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude?: number;

    @IsOptional()
    @IsEnum(PlaceType)
    placeType?: PlaceType;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(50)
    @Max(2000)
    radius?: number;

    @IsOptional()
    @IsString()
    iconResName?: string;

    @IsOptional()
    @IsBoolean()
    isSynced?: boolean;

    @IsOptional()
    @IsBoolean()
    isDeleted?: boolean;
}

// Backward-compatible re-export for any old imports.
export { UpdatePlaceDto } from "./update-place.dto";
