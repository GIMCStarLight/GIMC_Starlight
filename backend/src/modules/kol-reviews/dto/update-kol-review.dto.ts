import { PartialType } from '@nestjs/swagger';
import { CreateKolReviewDto } from './create-kol-review.dto';
import { IsOptional, IsInt, Min, Max, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateKolReviewDto extends PartialType(CreateKolReviewDto) {
  @ApiProperty({ description: '评分(1-5)', minimum: 1, maximum: 5, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  score?: number;

  @ApiProperty({ description: '评价内容', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;
}
