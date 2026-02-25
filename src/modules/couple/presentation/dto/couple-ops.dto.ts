import { IsString, IsNotEmpty, IsOptional, IsDateString, IsHexColor } from 'class-validator';

export class JoinCoupleDto {
  @IsString()
  @IsNotEmpty()
  inviteCode: string;
}

export class UpdateCoupleDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  theme?: string;
}
