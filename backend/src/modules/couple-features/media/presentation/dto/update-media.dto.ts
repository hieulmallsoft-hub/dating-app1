import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateMediaDto {
  @ApiPropertyOptional({
    description: "Media caption",
    example: "Updated caption from mobile"
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;

  @ApiPropertyOptional({
    description: "Visibility level",
    enum: ["couple_only", "friends", "public"],
    example: "friends"
  })
  @IsOptional()
  @IsIn(["couple_only", "friends", "public"])
  visibility?: "couple_only" | "friends" | "public";

  @ApiPropertyOptional({
    description: "Thumbnail URL",
    example: "https://cdn.example.com/media/photo-1-thumb-v2.jpg"
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  thumbUrl?: string;
}
