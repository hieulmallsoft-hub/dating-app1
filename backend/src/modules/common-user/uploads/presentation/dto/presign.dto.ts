import { IsString, IsNotEmpty, IsEnum } from "class-validator";

export enum FileType {
    IMAGE = "image",
    VIDEO = "video",
    VOICE = "voice"
}

export class PresignDto {
    @IsString()
    @IsNotEmpty()
    fileName: string;

    @IsEnum(FileType)
    type: FileType;
}
