import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { MessageType } from '../../domain/entities/message.entity';

export class SendMessageDto {
  @IsEnum(MessageType)
  type: MessageType;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  tempId?: string; // for client-side optimistic updates
}
