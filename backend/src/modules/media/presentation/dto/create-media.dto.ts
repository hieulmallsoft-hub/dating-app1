import { IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class CreateMediaDto {
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @IsOptional()
  @IsIn(["image", "video"])
  type?: "image" | "video";

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;

  @IsOptional()
  @IsIn(["couple_only", "friends", "public"])
  visibility?: "couple_only" | "friends" | "public";

  @IsOptional()
  @IsUrl()
  thumbUrl?: string;
}

