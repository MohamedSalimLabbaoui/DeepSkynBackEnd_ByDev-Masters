import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Login2faDto {
  @ApiProperty({
    description: "Nom d'utilisateur Keycloak",
    example: 'john.doe',
  })
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  username: string;

  @ApiProperty({
    description: 'Mot de passe (minimum 4 caractères)',
    example: 'password123',
    minLength: 4,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(4, { message: 'Password must be at least 4 characters' })
  password: string;

  @ApiPropertyOptional({
    description: 'Code TOTP à 6 chiffres (requis si le 2FA est activé)',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'Le code 2FA doit contenir exactement 6 chiffres' })
  twoFactorCode?: string;

  @ApiPropertyOptional({
    description: 'Token de vérification reCAPTCHA',
  })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}
