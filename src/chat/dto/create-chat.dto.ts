import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export class ChatMessageDto {
  @ApiProperty({
    description: 'Rôle de l\'auteur du message',
    enum: MessageRole,
    example: 'user',
  })
  @IsEnum(MessageRole)
  role: MessageRole;

  @ApiProperty({
    description: 'Contenu du message',
    example: 'Quels sont les meilleurs ingrédients pour l\'acné ?',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Horodatage du message',
    example: '2026-02-04T10:30:00.000Z',
  })
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class CreateChatDto {
  @ApiProperty({
    description: 'Liste des messages de la conversation',
    type: [ChatMessageDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @ApiPropertyOptional({
    description: 'Contexte additionnel (profil de peau, préférences)',
    example: { skinType: 'oily', concerns: ['acne'] },
  })
  @IsOptional()
  context?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Utilisateur premium (accès à plus de fonctionnalités)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;
}
