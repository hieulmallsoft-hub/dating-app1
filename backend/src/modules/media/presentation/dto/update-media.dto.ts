import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class UpdateMediaDto {
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

