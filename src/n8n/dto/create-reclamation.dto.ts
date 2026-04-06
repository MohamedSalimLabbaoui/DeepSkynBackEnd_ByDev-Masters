import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateReclamationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nom: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  type_reclamation: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;
}