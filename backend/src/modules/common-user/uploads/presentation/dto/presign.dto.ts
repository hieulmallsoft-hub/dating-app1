import { IsString, IsNotEmpty, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export enum FileType {
    IMAGE = "image",
    VIDEO = "video",
    VOICE = "voice"
}

export class PresignDto {
    @ApiProperty({
        description: "Original file name",
        example: "photo-123.jpg"
    })
    @IsString()
    @IsNotEmpty()
    fileName: string;

    @ApiProperty({
        description: "File type category",
        enum: FileType,
        example: FileType.IMAGE
    })
    @IsEnum(FileType)
    type: FileType;
}
