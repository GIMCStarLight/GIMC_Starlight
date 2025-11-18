import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ValidationPipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { KolReviewsService } from './kol-reviews.service';
import { QueryKolReviewsDto, CreateKolReviewDto, UpdateKolReviewDto, BatchAuditDto, BatchDeleteDto, ReviewStatisticsDto } from './dto';

@Controller('kol-reviews')
@ApiTags('KOL评价管理')
export class KolReviewsController {
  constructor(private readonly kolReviewsService: KolReviewsService) {}

  // 查询评论列表
  @Get()
  @ApiOperation({ summary: '获取评价列表', description: '支持分页、筛选、排序' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll(@Query(new ValidationPipe({ transform: true })) query: QueryKolReviewsDto) {
    return this.kolReviewsService.findAll(query);
  }

  // 获取统计数据
  @Get('statistics')
  @ApiOperation({ 
    summary: '获取评价统计数据',
    description: '获取达人评价的统计信息，包括总评价数、平均评分、评分分布等',
  })
  @ApiResponse({ 
    status: 200, 
    description: '查询成功',
    type: ReviewStatisticsDto,
  })
  getStatistics(): Promise<ReviewStatisticsDto> {
    return this.kolReviewsService.getStatistics();
  }

  // 根据authorId查询评论
  @Get('author/:authorId')
  @ApiOperation({ summary: '获取指定达人的评价列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findByAuthorId(@Param('authorId') authorId: string) {
    return this.kolReviewsService.findByAuthorId(authorId);
  }

  // 批量审核 - 必须在 :id/audit 之前
  @Post('batch/audit')
  @ApiOperation({ summary: '批量审核评价' })
  @ApiResponse({ status: 200, description: '批量审核成功' })
  batchAudit(@Body(ValidationPipe) data: BatchAuditDto) {
    return this.kolReviewsService.batchAudit(data.ids, data.status, data.auditor, data.comment);
  }

  // 批量删除
  @Post('batch/delete')
  @ApiOperation({ summary: '批量删除评价' })
  @ApiResponse({ status: 200, description: '批量删除成功' })
  batchRemove(@Body(ValidationPipe) data: BatchDeleteDto) {
    return this.kolReviewsService.batchRemove(data.ids, data.deletedBy);
  }

  // 根据ID查询评论
  @Get(':id')
  @ApiOperation({ summary: '获取评价详情' })
  @ApiParam({ name: 'id', description: '评价ID' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '评价不存在' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.kolReviewsService.findOne(id);
  }

  // 插入评论
  @Post()
  @ApiOperation({ summary: '创建评价' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数错误或重复评价' })
  create(@Body(ValidationPipe) data: CreateKolReviewDto) {
    return this.kolReviewsService.create(data);
  }

  // 更新评论
  @Patch(':id')
  @ApiOperation({ summary: '更新评价' })
  @ApiParam({ name: 'id', description: '评价ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '评价不存在' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) dto: UpdateKolReviewDto,
  ) {
    return this.kolReviewsService.update(id, dto);
  }

  // 审核评价
  @Post(':id/audit')
  @ApiOperation({ summary: '审核评价' })
  @ApiParam({ name: 'id', description: '评价ID' })
  @ApiResponse({ status: 200, description: '审核成功' })
  @ApiResponse({ status: 400, description: '评价状态不允许审核' })
  audit(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) data: { status: 'approved' | 'rejected'; auditor: string; comment?: string }
  ) {
    return this.kolReviewsService.audit(id, data.status, data.auditor, data.comment);
  }

  // 删除评价（软删除）
  @Delete(':id')
  @ApiOperation({ summary: '删除评价' })
  @ApiParam({ name: 'id', description: '评价ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '评价不存在' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.kolReviewsService.remove(id);
  }
}
