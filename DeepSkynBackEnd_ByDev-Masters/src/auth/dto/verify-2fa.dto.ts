import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Verify2faDto {
  @ApiProperty({
    description:
      "Code TOTP à 6 chiffres généré par l'application d'authentification",
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Le code doit contenir exactement 6 chiffres' })
  code: string;
}
