import { Type } from "class-transformer";
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min
} from "class-validator";
import { PlaceType } from "../../domain/entities/place.entity";

export class UpdatePlaceDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @IsOptional()
    @IsString()
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


    @IsOptional()
    @Type(() => Date)
    updatedAt: Date;


}
