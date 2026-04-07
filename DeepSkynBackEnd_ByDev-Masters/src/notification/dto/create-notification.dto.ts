import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({
    description: "ID de l'utilisateur destinataire",
    example: '89324390-127f-48c4-b382-2aef40f76add',
  })
  @IsString()
  @IsNotEmpty({ message: 'User ID is required' })
  userId: string;

  @ApiProperty({
    description: 'Titre de la notification',
    example: 'Nouvelle analyse disponible',
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @ApiProperty({
    description: 'Contenu du message de la notification',
    example: 'Votre analyse de peau est prête. Découvrez vos résultats !',
  })
  @IsString()
  @IsNotEmpty({ message: 'Message is required' })
  message: string;

  @ApiPropertyOptional({
    description: 'Type de notification',
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info',
  })
  @IsOptional()
  @IsString()
  @IsIn(['info', 'success', 'warning', 'error'], {
    message: 'Type must be one of: info, success, warning, error',
  })
  type?: 'info' | 'success' | 'warning' | 'error';

  @ApiPropertyOptional({
    description: "URL d'action pour rediriger l'utilisateur",
    example: '/analyses/123',
  })
  @IsOptional()
  @IsString()
  actionUrl?: string;
}
