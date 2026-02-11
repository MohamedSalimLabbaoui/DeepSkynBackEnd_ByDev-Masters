import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2faDto {
  @ApiProperty({
    description: 'Code TOTP à 6 chiffres pour confirmer l\'activation du 2FA',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Le code doit contenir exactement 6 chiffres' })
  code: string;
}
