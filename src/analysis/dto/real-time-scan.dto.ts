import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RealTimeScanDto {
  @ApiProperty({
    description: 'Image encodée en Base64',
    example: '/9j/4AAQSkZJRgABAQAAAQABAAD...',
  })
  @IsString()
  image: string; // Base64 encoded image

  @ApiPropertyOptional({
    description: 'Type MIME de l\'image',
    enum: ['image/jpeg', 'image/png', 'image/webp'],
    default: 'image/jpeg',
  })
  @IsOptional()
  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'], {
    message: 'Mime type must be image/jpeg, image/png, or image/webp',
  })
  mimeType?: string;

  @ApiPropertyOptional({
    description: 'Sauvegarder l\'image sur Supabase',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  saveImage?: boolean; // Save image to Supabase

  @ApiPropertyOptional({
    description: 'Sauvegarder l\'analyse dans la base de données',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  saveAnalysis?: boolean; // Save analysis to database
}
