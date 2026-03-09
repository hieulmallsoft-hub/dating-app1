import { IsString, IsOptional, IsArray, IsEnum, IsNotEmpty } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { MomentPrivacy } from "../../domain/entities/moment.entity";

export class CreateMomentDto {
    @ApiPropertyOptional({
        description: "Moment text content",
        example: "Today was a beautiful day together."
    })
    @IsString()
    @IsOptional()
    content?: string;

    @ApiPropertyOptional({
        description: "Photo URLs",
        type: [String],
        example: ["https://cdn.example.com/photos/1.jpg", "https://cdn.example.com/photos/2.jpg"]
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    photos?: string[];

    @ApiPropertyOptional({
        description: "Visibility of moment",
        enum: MomentPrivacy,
        example: MomentPrivacy.COUPLE
    })
    @IsEnum(MomentPrivacy)
    @IsOptional()
    privacy?: MomentPrivacy;
}

export class UpdateMomentDto extends CreateMomentDto {}
