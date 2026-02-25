import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UploadsService } from '../application/uploads.service';
import { PresignDto } from './dto/presign.dto';
import { JwtAuthGuard } from '../../auth/infrastructure/strategies/jwt-auth-guard';

@ApiBearerAuth('JWT-auth')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('presign')
  @HttpCode(HttpStatus.OK)
  async presign(@Body() presignDto: PresignDto) {
    return this.uploadsService.generatePresignedUrl(presignDto.fileName, presignDto.type);
  }
}
