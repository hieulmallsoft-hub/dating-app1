import { IsIn, IsOptional, IsString, IsUrl } from "class-validator";

export class MediaDto {
    @IsString()
    coupleId: string;

    @IsString()
    url: string;

    @IsOptional()
    @IsUrl()
    thumbUrl?: string;


    @IsOptional()
    @IsString()
    caption?: string;


    @IsOptional()
    @IsIn(["image", "video"])
    type?: "image" | "video";

    @IsOptional()
    @IsIn(["couple_only", "friends", "public"])
    visibility?: "couple_only" | "friends" | "public";
}