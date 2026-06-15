import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

const normalizeString = (value: unknown) => (typeof value === "string" ? value.trim() : value);

export class GooglePlayVerifyDto {
    @ApiProperty({
        description: "Google Play purchase token from BillingClient",
        example: "hgclkg..." 
    })
    @Transform(({ value }) => normalizeString(value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(2048)
    purchaseToken: string;

    @ApiProperty({
        description: "Allowed subscription product id from Google Play Console",
        example: "premium_monthly"
    })
    @Transform(({ value }) => normalizeString(value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    productId: string;

    @ApiPropertyOptional({
        description: "Deprecated. Backend always uses GOOGLE_PLAY_PACKAGE_NAME.",
        example: "com.example.app"
    })
    @Transform(({ value }) => normalizeString(value))
    @IsOptional()
    @IsString()
    @MaxLength(200)
    packageName?: string;
}
