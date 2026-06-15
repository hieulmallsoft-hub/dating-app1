import { IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateMediaDto {
  @ApiProperty({
    description: "Public media URL",
    example: "https://cdn.example.com/media/photo-1.jpg"
  })
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({
    description: "Media type",
    enum: ["image", "video"],
    example: "image"
  })
  @IsOptional()
  @IsIn(["image", "video"])
  type?: "image" | "video";

  @ApiPropertyOptional({
    description: "Media caption",
    example: "Our weekend memory"
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;

  @ApiPropertyOptional({
    description: "Visibility level",
    enum: ["couple_only", "friends", "public"],
    example: "couple_only"
  })
  @IsOptional()
  @IsIn(["couple_only", "friends", "public"])
  visibility?: "couple_only" | "friends" | "public";

  @ApiPropertyOptional({
    description: "Thumbnail URL",
    example: "https://cdn.example.com/media/photo-1-thumb.jpg"
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  thumbUrl?: string;
}
