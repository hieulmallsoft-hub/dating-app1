import { Type } from "class-transformer";
import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,
    IsNumber,
    Min,
    Max,
    ValidateIf,
    MaxLength
} from "class-validator";
import { MessageType } from "../../domain/entities/message.entity";

export class SendMessageDto {
    @IsEnum(MessageType)
    type: MessageType;

    @IsString()
    @IsNotEmpty()
    content: string;

    @ValidateIf((o) => o.lng !== undefined)
    @Type(() => Number)
    @IsNumber()
    @Min(-90)
    @Max(90)
    @IsOptional()
    lat?: number;

    @ValidateIf((o) => o.lat !== undefined)
    @Type(() => Number)
    @IsNumber()
    @Min(-180)
    @Max(180)
    @IsOptional()
    lng?: number;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    locationName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    locationAddress?: string;

    @IsString()
    @IsOptional()
    tempId?: string; // for client-side optimistic updates
}
