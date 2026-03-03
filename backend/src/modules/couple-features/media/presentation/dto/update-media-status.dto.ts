import { IsIn } from "class-validator";

export class UpdateMediaStatusDto {
  @IsIn(["processing", "active", "flagged", "synced"])
  status: "processing" | "active" | "flagged" | "synced";
}
