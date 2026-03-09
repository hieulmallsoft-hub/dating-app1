import { IsString, IsNotEmpty, IsOptional, IsDateString, IsBoolean } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateEventDto {
    @ApiProperty({
        description: "Event title",
        example: "First date anniversary"
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional({
        description: "Event description",
        example: "Dinner at our favorite restaurant"
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({
        description: "Event date (ISO-8601)",
        example: "2026-03-09T19:00:00.000Z"
    })
    @IsDateString()
    @IsNotEmpty()
    date: string;

    @ApiPropertyOptional({
        description: "Mark as anniversary event",
        example: false
    })
    @IsBoolean()
    @IsOptional()
    isAnniversary?: boolean;
}

export class UpdateEventDto extends CreateEventDto {}
