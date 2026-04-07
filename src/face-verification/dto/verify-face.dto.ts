import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, ArrayMinSize } from 'class-validator';

export class VerifyFaceDto {
  @ApiProperty({
    description: 'Descripteur facial (vecteur de 128 dimensions de face-api.js)',
    type: [Number],
    example: [0.1, -0.2, 0.3],
  })
  @IsArray()
  @ArrayMinSize(128)
  @IsNumber({}, { each: true })
  descriptor: number[];

  @ApiPropertyOptional({
    description: "Image encodée en Base64 (optionnel, pour stocker l'image de référence)",
    example: '/9j/4AAQSkZJRgABAQAAAQABAAD...',
  })
  @IsOptional()
  @IsString()
  imageBase64?: string;
}
