import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    avatar?: string;

    @IsOptional()
    @IsString()
    avatar3D?: string;

    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;

    @IsOptional()
    @IsString()
    gender?: string;

    @IsOptional()
    @IsString()
    preferredLanguage?: string;

    @IsOptional()
    settings?: any;
}
