import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches } from "class-validator";

export class PinBodyDto {
    @ApiProperty({
        description: "PIN code with exactly 4 digits",
        example: "1234"
    })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\d{4}$/)
    pin: string;
}

export class SetPinResponseDto {
    @ApiProperty({
        description: "Security record id",
        example: "2f8f3793-c8ac-4a85-9e61-0fd7999a0d08"
    })
    id: string;

    @ApiProperty({
        description: "Owner user id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    userId: string;

    @ApiProperty({
        description: "Updated time (ISO-8601)",
        example: "2026-03-09T08:00:00.000Z"
    })
    updatedAt: string;
}

export class VerifyPinResponseDto {
    @ApiProperty({
        description: "Verification result",
        example: true
    })
    success: boolean;
}
