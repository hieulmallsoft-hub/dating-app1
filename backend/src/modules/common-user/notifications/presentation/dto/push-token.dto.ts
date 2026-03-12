import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { PUSH_TOKEN_PLATFORMS, type PushTokenPlatform } from "../../domain/entities/push-token.entity";

export class PushTokenBodyDto {
    @ApiProperty({
        description: "FCM device token returned by Firebase SDK on mobile/web client",
        example:
            "fM-IbB6CeE0:APA91bH4h1YdZQ8hSY7qf9h0P9x9f2j7w6Q3LQ7q5XCYrBfS_ZmL5D5x2mQ5cL8jTQd"
    })
    @IsString()
    @MinLength(20)
    @MaxLength(4096)
    token: string;

    @ApiPropertyOptional({
        description: "Device platform that owns this token. For Android app, use `android`.",
        enum: PUSH_TOKEN_PLATFORMS,
        example: "android",
        default: "web"
    })
    @IsOptional()
    @IsIn(PUSH_TOKEN_PLATFORMS)
    platform?: PushTokenPlatform;
}

export class PushTokenAckDto {
    @ApiProperty({
        example: true
    })
    success: boolean;
}
