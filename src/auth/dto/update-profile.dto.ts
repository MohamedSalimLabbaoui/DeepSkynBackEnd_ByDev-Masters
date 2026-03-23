import { IsEmail, IsOptional, IsString, IsDateString, IsNumber, IsLatitude, IsLongitude } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
    @ApiProperty({ example: 'John Doe', required: false })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({ example: 'john@example.com', required: false })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiProperty({ example: 'https://example.com/avatar.png', required: false })
    @IsOptional()
    @IsString()
    avatar?: string;

    @ApiProperty({ example: 'Male', required: false })
    @IsOptional()
    @IsString()
    gender?: string;

    @ApiProperty({ example: '1990-01-01', required: false })
    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;

    @ApiProperty({ example: 'fr', required: false })
    @IsOptional()
    @IsString()
    preferredLanguage?: string;

    @ApiProperty({ example: '123 Rue de la Paix, Tunis', required: false })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiProperty({ example: 'Tunis', required: false })
    @IsOptional()
    @IsString()
    city?: string;

    @ApiProperty({ example: '1000', required: false })
    @IsOptional()
    @IsString()
    zipCode?: string;

    @ApiProperty({ example: 'Tunisia', required: false })
    @IsOptional()
    @IsString()
    country?: string;

    @ApiProperty({ example: 36.8065, required: false })
    @IsOptional()
    @IsNumber()
    @IsLatitude()
    latitude?: number;

    @ApiProperty({ example: 10.1956, required: false })
    @IsOptional()
    @IsNumber()
    @IsLongitude()
    longitude?: number;
}
