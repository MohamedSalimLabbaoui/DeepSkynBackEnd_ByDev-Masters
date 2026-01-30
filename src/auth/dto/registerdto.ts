import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
    @IsString()
    @MinLength(3, { message: 'Le username doit contenir au moins 3 caractères' })
    username: string;

    @IsEmail({}, { message: 'Email invalide' })
    email: string;

    @IsString()
    @MinLength(6, { message: 'Le password doit contenir au moins 6 caractères' })
    password: string;

    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;
}
