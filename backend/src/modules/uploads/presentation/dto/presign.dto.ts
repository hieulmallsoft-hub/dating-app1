import { IsString, IsNotEmpty, IsEnum } from "class-validator";

export enum FileType {
    IMAGE = "image",
    VOICE = "voice"
}

export class PresignDto {
    @IsString()
    @IsNotEmpty()
    fileName: string;

    @IsEnum(FileType)
    type: FileType;
}
