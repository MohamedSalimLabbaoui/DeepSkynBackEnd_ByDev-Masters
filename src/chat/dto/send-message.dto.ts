import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    description: 'Message à envoyer au chatbot',
    example: 'Comment traiter les taches brunes ?',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'ID de la conversation existante pour continuer le chat',
    example: 'chat-uuid-123',
  })
  @IsOptional()
  @IsString()
  chatId?: string; // Si fourni, continue la conversation existante

  @ApiPropertyOptional({
    description: 'Contexte additionnel (profil de peau, historique)',
    example: { skinType: 'combination', concerns: ['hyperpigmentation'] },
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>; // Contexte additionnel (skin profile, etc.)
}
