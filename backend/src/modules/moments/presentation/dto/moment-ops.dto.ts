import { IsString, IsOptional, IsArray, IsEnum, IsNotEmpty } from "class-validator";
import { MomentPrivacy } from "../../domain/entities/moment.entity";

export class CreateMomentDto {
    @IsString()
    @IsOptional()
    content?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    photos?: string[];

    @IsEnum(MomentPrivacy)
    @IsOptional()
    privacy?: MomentPrivacy;
}

export class UpdateMomentDto extends CreateMomentDto {}
