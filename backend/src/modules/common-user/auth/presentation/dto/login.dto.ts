import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
    @ApiProperty({
        description: "Account email",
        example: "user@example.com"
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        description: "Account password (min 6 chars)",
        example: "123456"
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;
}
