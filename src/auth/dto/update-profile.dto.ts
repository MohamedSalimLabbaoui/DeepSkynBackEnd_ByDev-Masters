import { IsEmail, IsOptional, IsString, IsDateString } from 'class-validator';
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
}
