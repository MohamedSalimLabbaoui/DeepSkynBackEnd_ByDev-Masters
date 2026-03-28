import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifySignupCodeDto {
  @ApiProperty({
    description: "Adresse email de l'utilisateur",
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: "L'email est requis" })
  email: string;

  @ApiProperty({
    description: 'Code de verification a 6 chiffres',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: 'Le code doit contenir 6 chiffres' })
  code: string;
}
