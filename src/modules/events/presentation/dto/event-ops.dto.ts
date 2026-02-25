import { IsString, IsNotEmpty, IsOptional, IsDateString, IsBoolean } from "class-validator";

export class CreateEventDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsDateString()
    @IsNotEmpty()
    date: string;

    @IsBoolean()
    @IsOptional()
    isAnniversary?: boolean;
}

export class UpdateEventDto extends CreateEventDto {}
