import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterDto {
    @ApiProperty({
        description: "Email for account registration",
        example: "mobile.user@example.com"
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiPropertyOptional({
        description: "Password for local login (min 6 chars). Optional for social-first accounts.",
        example: "123456"
    })
    @IsString()
    @IsOptional()
    @MinLength(6)
    password?: string;

    @ApiPropertyOptional({
        description: "Display name",
        example: "Mobile User"
    })
    @IsString()
    @IsOptional()
    fullName?: string;
}
