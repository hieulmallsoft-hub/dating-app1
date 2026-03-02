import { IsIn, IsNotEmpty, IsOptional, IsUUID, IsUrl } from "class-validator";

export class AddMediaDto {
  @IsUUID()
  @IsNotEmpty()
  coupleId: string;

  @IsUrl()
  @IsNotEmpty()
  url: string;

  @IsOptional()
  @IsIn(["image", "video"])
  type?: "image" | "video";
}
