import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestSignupCodeDto {
  @ApiProperty({
    description: "Adresse email de l'utilisateur",
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: "L'email est requis" })
  email: string;

  @ApiProperty({
    description: 'Mot de passe (minimum 6 caracteres)',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caracteres' })
  password: string;

  @ApiProperty({
    description: "Nom complet de l'utilisateur",
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  name: string;

  @ApiPropertyOptional({
    description: "Prenom de l'utilisateur",
    example: 'John',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: "Nom de famille de l'utilisateur",
    example: 'Doe',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Token de verification reCAPTCHA',
  })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}
