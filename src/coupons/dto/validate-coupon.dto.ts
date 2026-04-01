import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ValidateCouponDto {
  @ApiProperty({ example: 'WELCOME20' })
  @IsString()
  couponCode: string;

  @ApiProperty({ example: 'premium' })
  @IsString()
  planCode: string;
}
