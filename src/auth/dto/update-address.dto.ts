import { IsString, IsNumber, IsLatitude, IsLongitude } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAddressDto {
  @ApiProperty({ example: '123 Rue de la Paix, Tunis' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'Tunis' })
  @IsString()
  city: string;

  @ApiProperty({ example: '1000' })
  @IsString()
  zipCode: string;

  @ApiProperty({ example: 'Tunisia' })
  @IsString()
  country: string;

  @ApiProperty({ example: 36.8065 })
  @IsNumber()
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 10.1956 })
  @IsNumber()
  @IsLongitude()
  longitude: number;
}
