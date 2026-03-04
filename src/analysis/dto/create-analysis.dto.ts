import {
  IsArray,
  IsOptional,
  IsUrl,
  ArrayMaxSize,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAnalysisDto {
  @ApiProperty({
    description: 'URLs des images de peau à analyser (max 5)',
    type: [String],
    example: ['https://storage.supabase.co/deepskyn-images/face1.jpg'],
    maxItems: 5,
  })
  @IsArray()
  @IsUrl({}, { each: true, message: 'Each image must be a valid URL' })
  @ArrayMaxSize(5, { message: 'Maximum 5 images allowed' })
  images: string[];

  @ApiPropertyOptional({
    description: 'Questionnaire de pré-analyse (habitudes, préférences)',
    example: { age: 28, hasAllergies: false, skinRoutine: 'basic' },
  })
  @IsOptional()
  @IsObject()
  questionnaire?: Record<string, any>;
}
