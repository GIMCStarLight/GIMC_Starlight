import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  Logger,
  ParseIntPipe,
  ValidationPipe,
  UsePipes,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import {
  SupplierDatabaseService,
  PaginationResult,
  BatchCreateResult,
} from './supplier-database.service';
import {
  CreateSupplierDatabaseDto,
  UpdateSupplierDatabaseDto,
  QuerySupplierDatabaseDto,
  BatchCreateSupplierDatabaseDto,
} from './dto';
import { SupplierDatabase } from '../../database/entities/supplier-database.entity';

@ApiTags('供应商数据库管理')
@Controller('v2/supplier-database')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
  }),
)
export class SupplierDatabaseController {
  private readonly logger = new Logger(SupplierDatabaseController.name);

  constructor(
    private readonly supplierDatabaseService: SupplierDatabaseService,
  ) {}

  @Post()
  @ApiOperation({ summary: '创建供应商', description: '创建新的供应商记录' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '创建成功',
    type: SupplierDatabase,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '供应商全称已存在',
  })
  @ApiBody({ type: CreateSupplierDatabaseDto })
  async create(
    @Body() createSupplierDatabaseDto: CreateSupplierDatabaseDto,
  ): Promise<SupplierDatabase> {
    this.logger.log(`创建供应商: ${JSON.stringify(createSupplierDatabaseDto)}`);
    return await this.supplierDatabaseService.create(createSupplierDatabaseDto);
  }

  @Post('batch')
  @ApiOperation({
    summary: '批量创建供应商',
    description: '批量创建多个供应商记录',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '批量创建完成',
    schema: {
      type: 'object',
      properties: {
        successCount: { type: 'number', description: '成功创建的数量' },
        failedCount: { type: 'number', description: '创建失败的数量' },
        failedItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              index: { type: 'number', description: '失败项的索引' },
              data: { $ref: '#/components/schemas/CreateSupplierDatabaseDto' },
              error: { type: 'string', description: '错误信息' },
            },
          },
        },
        createdItems: {
          type: 'array',
          items: { $ref: '#/components/schemas/SupplierDatabase' },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数错误',
  })
  @ApiBody({ type: BatchCreateSupplierDatabaseDto })
  async batchCreate(
    @Body() batchCreateDto: BatchCreateSupplierDatabaseDto,
  ): Promise<BatchCreateResult> {
    this.logger.log(`批量创建供应商: ${batchCreateDto.suppliers.length} 个`);
    return await this.supplierDatabaseService.batchCreate(batchCreateDto);
  }

  @Get()
  @ApiOperation({
    summary: '获取供应商列表',
    description: '分页查询供应商列表，支持多种筛选条件',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/SupplierDatabase' },
        },
        total: { type: 'number', description: '总记录数' },
        page: { type: 'number', description: '当前页码' },
        limit: { type: 'number', description: '每页记录数' },
        totalPages: { type: 'number', description: '总页数' },
        hasNext: { type: 'boolean', description: '是否有下一页' },
        hasPrev: { type: 'boolean', description: '是否有上一页' },
      },
    },
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: '页码',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '每页数量',
    type: Number,
  })
  @ApiQuery({
    name: 'supplier_full_name',
    required: false,
    description: '供应商全称搜索',
  })
  @ApiQuery({ name: 'mcn_name', required: false, description: 'MCN机构名搜索' })
  @ApiQuery({
    name: 'supplier_nature',
    required: false,
    description: '供应商性质筛选',
  })
  @ApiQuery({
    name: 'current_policy_gradient',
    required: false,
    description: '当前政策梯度筛选',
  })
  @ApiQuery({
    name: 'min_total_amount_24',
    required: false,
    description: '24年最小累量金额',
    type: Number,
  })
  @ApiQuery({
    name: 'max_total_amount_24',
    required: false,
    description: '24年最大累量金额',
    type: Number,
  })
  @ApiQuery({
    name: 'min_total_amount_25',
    required: false,
    description: '25年最小累量金额',
    type: Number,
  })
  @ApiQuery({
    name: 'max_total_amount_25',
    required: false,
    description: '25年最大累量金额',
    type: Number,
  })
  @ApiQuery({
    name: 'is_agent_order',
    required: false,
    description: '是否代下单',
  })
  @ApiQuery({
    name: 'is_dual_signed',
    required: false,
    description: '是否双盖合同',
  })
  @ApiQuery({
    name: 'primary_contact_name',
    required: false,
    description: '一级对接人姓名搜索',
  })
  @ApiQuery({
    name: 'contract_follow_up_person',
    required: false,
    description: '合同跟进人搜索',
  })
  @ApiQuery({
    name: 'contract_start_from',
    required: false,
    description: '合同开始时间起始',
  })
  @ApiQuery({
    name: 'contract_start_to',
    required: false,
    description: '合同开始时间结束',
  })
  @ApiQuery({
    name: 'contract_end_from',
    required: false,
    description: '合同结束时间起始',
  })
  @ApiQuery({
    name: 'contract_end_to',
    required: false,
    description: '合同结束时间结束',
  })
  @ApiQuery({
    name: 'can_cooperate_douyin',
    required: false,
    description: '可合作抖音',
    type: Boolean,
  })
  @ApiQuery({
    name: 'can_cooperate_xiaohongshu',
    required: false,
    description: '可合作小红书',
    type: Boolean,
  })
  @ApiQuery({
    name: 'can_cooperate_wechat_mp',
    required: false,
    description: '可合作微信公众号',
    type: Boolean,
  })
  @ApiQuery({
    name: 'can_cooperate_wechat_video',
    required: false,
    description: '可合作微信视频号',
    type: Boolean,
  })
  @ApiQuery({
    name: 'can_cooperate_weibo',
    required: false,
    description: '可合作微博',
    type: Boolean,
  })
  @ApiQuery({
    name: 'can_cooperate_bilibili',
    required: false,
    description: '可合作B站',
    type: Boolean,
  })
  @ApiQuery({
    name: 'can_cooperate_zhihu',
    required: false,
    description: '可合作知乎',
    type: Boolean,
  })
  @ApiQuery({
    name: 'can_cooperate_kuaishou',
    required: false,
    description: '可合作快手',
    type: Boolean,
  })
  @ApiQuery({
    name: 'can_cooperate_dongchedi',
    required: false,
    description: '可合作懂车帝',
    type: Boolean,
  })
  @ApiQuery({ name: 'sort_by', required: false, description: '排序字段' })
  @ApiQuery({ name: 'sort_order', required: false, description: '排序方向' })
  async findAll(
    @Query() queryDto: QuerySupplierDatabaseDto,
  ): Promise<PaginationResult<SupplierDatabase>> {
    this.logger.log(`查询供应商列表: ${JSON.stringify(queryDto)}`);
    return await this.supplierDatabaseService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取供应商详情',
    description: '根据ID获取供应商详细信息',
  })
  @ApiParam({ name: 'id', description: '供应商ID', type: 'number' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
    type: SupplierDatabase,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '供应商不存在',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SupplierDatabase> {
    this.logger.log(`查询供应商详情: ID=${id}`);
    return await this.supplierDatabaseService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '更新供应商信息',
    description: '根据ID更新供应商信息',
  })
  @ApiParam({ name: 'id', description: '供应商ID', type: 'number' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '更新成功',
    type: SupplierDatabase,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '供应商不存在',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '供应商全称已存在',
  })
  @ApiBody({ type: UpdateSupplierDatabaseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSupplierDatabaseDto: UpdateSupplierDatabaseDto,
  ): Promise<SupplierDatabase> {
    this.logger.log(
      `更新供应商: ID=${id}, ${JSON.stringify(updateSupplierDatabaseDto)}`,
    );
    return await this.supplierDatabaseService.update(
      id,
      updateSupplierDatabaseDto,
    );
  }

  @Delete('batch')
  @ApiOperation({
    summary: '批量删除供应商',
    description: '根据ID列表批量删除供应商',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'number' },
          description: '供应商ID列表',
        },
      },
      required: ['ids'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '批量删除完成',
    schema: {
      type: 'object',
      properties: {
        deletedCount: { type: 'number', description: '成功删除的数量' },
        failedIds: {
          type: 'array',
          items: { type: 'number' },
          description: '删除失败的ID列表',
        },
      },
    },
  })
  async removeBatch(
    @Body('ids') ids: number[],
  ): Promise<{ deletedCount: number; failedIds: number[] }> {
    this.logger.log(`批量删除供应商: IDs=${JSON.stringify(ids)}`);
    return await this.supplierDatabaseService.removeBatch(ids);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除供应商', description: '根据ID删除供应商' })
  @ApiParam({ name: 'id', description: '供应商ID', type: 'number' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '删除成功',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '供应商不存在',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    this.logger.log(`删除供应商: ID=${id}`);
    return await this.supplierDatabaseService.remove(id);
  }

  @Get('template/download')
  @ApiOperation({
    summary: '下载导入模板',
    description: '下载供应商数据导入的Excel模板文件',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '模板下载成功',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async downloadTemplate(@Res() res: Response): Promise<void> {
    const startTime = Date.now();
    this.logger.log('🚀 [下载模板] 开始生成供应商导入模板');

    try {
      this.logger.log('📊 [下载模板] 调用服务生成Excel模板');
      const buffer =
        await this.supplierDatabaseService.generateImportTemplate();
      const generateTime = Date.now();

      this.logger.log('✅ [下载模板] Excel模板生成成功', {
        bufferSize: buffer.length,
        generateDuration: `${generateTime - startTime}ms`,
      });

      if (!buffer || buffer.length === 0) {
        this.logger.error('❌ [下载模板] 生成的Excel缓冲区为空');
        throw new Error('生成的Excel文件为空');
      }

      this.logger.log('📋 [下载模板] 设置响应头');

      // 设置响应头，避免缓存问题
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="supplier-import-template.xlsx"',
      );
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      this.logger.log('📤 [下载模板] 发送Excel文件', {
        contentType: res.getHeader('Content-Type'),
        contentDisposition: res.getHeader('Content-Disposition'),
        cacheControl: res.getHeader('Cache-Control'),
        bufferSize: buffer.length,
      });

      res.send(buffer);

      const endTime = Date.now();
      this.logger.log('✅ [下载模板] 模板下载完成', {
        totalDuration: `${endTime - startTime}ms`,
        fileSize: buffer.length,
      });
    } catch (error: any) {
      const endTime = Date.now();
      this.logger.error('❌ [下载模板] 模板生成失败', {
        error: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace',
        duration: `${endTime - startTime}ms`,
      });

      // 设置错误响应
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: '模板生成失败',
          error: error?.message || 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
}
