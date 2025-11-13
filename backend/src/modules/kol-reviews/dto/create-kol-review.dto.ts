import { IsString, IsNotEmpty, IsInt, Min, Max, MaxLength, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReviewType } from '../../../database/entities/kol-reviews.entity';

export class CreateKolReviewDto {
  @ApiProperty({ description: '达人ID' })
  @IsString()
  @IsNotEmpty()
  authorId: string;

  @ApiProperty({ description: '评价人' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  reviewer: string;

  @ApiProperty({ description: '评分(1-5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @ApiProperty({ description: '评价内容' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiProperty({ description: '评价类型', enum: ReviewType, required: false })
  @IsOptional()
  @IsEnum(ReviewType)
  reviewType?: ReviewType;

  @ApiProperty({ description: '评价标签', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reviewTags?: string[];
}
