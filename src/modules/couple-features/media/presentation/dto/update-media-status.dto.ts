import { IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateMediaStatusDto {
  @ApiProperty({
    description: "Media processing status",
    enum: ["processing", "active", "flagged", "synced"],
    example: "active"
  })
  @IsIn(["processing", "active", "flagged", "synced"])
  status: "processing" | "active" | "flagged" | "synced";
}
