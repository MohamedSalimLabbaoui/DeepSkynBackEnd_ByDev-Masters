import { IsString, IsOptional, IsIn, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationDto {
  @ApiPropertyOptional({
    description: 'Nouveau titre de la notification',
    example: 'Titre mis à jour',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Nouveau contenu du message',
    example: 'Message mis à jour',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description: 'Type de notification',
    enum: ['info', 'success', 'warning', 'error'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['info', 'success', 'warning', 'error'], {
    message: 'Type must be one of: info, success, warning, error',
  })
  type?: 'info' | 'success' | 'warning' | 'error';

  @ApiPropertyOptional({
    description: 'Statut de lecture de la notification',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({
    description: 'URL d\'action pour rediriger l\'utilisateur',
    example: '/analyses/456',
  })
  @IsOptional()
  @IsString()
  actionUrl?: string;
}
