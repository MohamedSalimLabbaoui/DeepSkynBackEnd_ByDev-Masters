import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BroadcastNotificationDto {
  @ApiProperty({
    description: 'Titre de la notification broadcast',
    example: 'Maintenance prévue',
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @ApiProperty({
    description: 'Message de la notification broadcast',
    example: 'Une maintenance est prévue demain à 02h00.',
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
    description: 'URL d\'action optionnelle',
    example: '/status',
  })
  @IsOptional()
  @IsString()
  actionUrl?: string;
}
