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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  KolListService,
  PaginationResult,
  BatchCreateResult,
} from './kol-list.service';
import {
  CreateKolListDto,
  UpdateKolListDto,
  QueryKolListDto,
  BatchCreateKolListDto,
} from './dto';
import { KolList, MatchStatus } from '../../database/entities/kol-list.entity';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { FieldFilterInterceptor } from '../../common/interceptors/field-filter.interceptor';
import { FilterFields, SkipFieldFilter } from '../../common/decorators/field-filter.decorator';

@ApiTags('KOL达人管理')
@Controller('kol-lists')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(FieldFilterInterceptor)
@FilterFields('kol')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
  }),
)
export class KolListController {
  private readonly logger = new Logger(KolListController.name);

  constructor(private readonly kolListService: KolListService) {}

  @Post()
  @Permissions('kol:create')
  @ApiOperation({ summary: '创建KOL', description: '创建新的KOL记录' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '创建成功',
    type: KolList,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '平台和账号ID组合已存在',
  })
  @ApiBody({ type: CreateKolListDto })
  async create(@Body() createKolListDto: CreateKolListDto): Promise<KolList> {
    this.logger.log(`创建KOL: ${JSON.stringify(createKolListDto)}`);
    return await this.kolListService.create(createKolListDto);
  }

  @Post('batch')
  @Permissions('kol:batch:create')
  @ApiOperation({ summary: '批量创建KOL', description: '批量创建多个KOL记录' })
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
              data: { $ref: '#/components/schemas/CreateKolListDto' },
              error: { type: 'string', description: '错误信息' },
            },
          },
        },
        createdItems: {
          type: 'array',
          items: { $ref: '#/components/schemas/KolList' },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数错误',
  })
  @ApiBody({ type: BatchCreateKolListDto })
  async batchCreate(
    @Body() batchCreateDto: BatchCreateKolListDto,
  ): Promise<BatchCreateResult> {
    this.logger.log(`批量创建KOL: ${batchCreateDto.kols.length} 个`);
    return await this.kolListService.batchCreate(batchCreateDto);
  }

  @Get()
  @Permissions('kol:view')
  @ApiOperation({
    summary: '获取KOL列表',
    description: '分页查询KOL列表，支持多种筛选条件',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/KolList' },
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
  @ApiQuery({ name: 'platform', required: false, description: '平台筛选' })
  @ApiQuery({
    name: 'account_name',
    required: false,
    description: '账号名称搜索',
  })
  @ApiQuery({ name: 'account_id', required: false, description: '账号ID搜索' })
  @ApiQuery({ name: 'org_name', required: false, description: '机构名筛选' })
  @ApiQuery({ name: 'category', required: false, description: '账号类型筛选' })
  @ApiQuery({
    name: 'min_followers_w',
    required: false,
    description: '最小粉丝量（万）',
    type: Number,
  })
  @ApiQuery({
    name: 'max_followers_w',
    required: false,
    description: '最大粉丝量（万）',
    type: Number,
  })
  @ApiQuery({
    name: 'is_exclusive',
    required: false,
    description: '是否独家',
    type: Number,
  })
  @ApiQuery({
    name: 'rebate_policy',
    required: false,
    description: '返点政策',
    type: Number,
  })
  @ApiQuery({ name: 'policy_level', required: false, description: '政策等级' })
  @ApiQuery({ name: 'sort_by', required: false, description: '排序字段' })
  @ApiQuery({ name: 'sort_order', required: false, description: '排序方向' })
  @ApiQuery({ name: 'matched_author_id', required: false, description: '匹配的公海作者ID', type: String })
  @ApiQuery({ name: 'matched_author_ids', required: false, description: '匹配的公海作者ID列表', isArray: true, type: String })
  @ApiQuery({ name: 'match_status', required: false, description: '匹配状态', enum: Object.values(MatchStatus) })
  @ApiQuery({ name: 'matched_only', required: false, description: '仅展示已匹配达人', type: Boolean })
  async findAll(
    @Query() queryDto: QueryKolListDto,
  ): Promise<PaginationResult<KolList>> {
    this.logger.log(`查询KOL列表: ${JSON.stringify(queryDto)}`);
    return await this.kolListService.findAll(queryDto);
  }

  @Get('platforms')
  @Permissions('kol:view')
  @SkipFieldFilter() // 枚举接口不需要字段过滤
  @ApiOperation({
    summary: '获取平台列表',
    description: '返回已存在的KOL平台枚举',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
    type: [String],
  })
  async getPlatforms(): Promise<string[]> {
    this.logger.log('查询平台枚举');
    return await this.kolListService.getPlatforms();
  }

  @Get('categories')
  @Permissions('kol:view')
  @SkipFieldFilter() // 枚举接口不需要字段过滤
  @ApiOperation({
    summary: '获取分类列表',
    description: '返回已存在的KOL分类枚举',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
    type: [String],
  })
  async getCategories(): Promise<string[]> {
    this.logger.log('查询分类枚举');
    return await this.kolListService.getCategories();
  }

  @Get('organizations')
  @Permissions('kol:view')
  @SkipFieldFilter() // 枚举接口不需要字段过滤
  @ApiOperation({
    summary: '获取机构列表',
    description: '返回已存在的机构名称枚举',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
    type: [String],
  })
  async getOrganizations(): Promise<string[]> {
    this.logger.log('查询机构枚举');
    return await this.kolListService.getOrganizations();
  }

  @Get(':id')
  @Permissions('kol:view')
  @ApiOperation({
    summary: '获取KOL详情',
    description: '根据ID获取KOL详细信息',
  })
  @ApiParam({ name: 'id', description: 'KOL ID', type: 'number' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
    type: KolList,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'KOL不存在',
  })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<KolList> {
    this.logger.log(`查询KOL详情: ID ${id}`);
    return await this.kolListService.findOne(id);
  }

  @Patch(':id')
  @Permissions('kol:update')
  @ApiOperation({ summary: '更新KOL信息', description: '根据ID更新KOL信息' })
  @ApiParam({ name: 'id', description: 'KOL ID', type: 'number' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '更新成功',
    type: KolList,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'KOL不存在',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '平台和账号ID组合已存在',
  })
  @ApiBody({ type: UpdateKolListDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateKolListDto: UpdateKolListDto,
  ): Promise<KolList> {
    this.logger.log(
      `更新KOL: ID ${id}, 数据: ${JSON.stringify(updateKolListDto)}`,
    );
    return await this.kolListService.update(id, updateKolListDto);
  }

  @Delete(':id')
  @Permissions('kol:delete')
  @ApiOperation({ summary: '删除KOL', description: '根据ID删除KOL' })
  @ApiParam({ name: 'id', description: 'KOL ID', type: 'number' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '删除成功',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'KOL不存在',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    this.logger.log(`删除KOL: ID ${id}`);
    await this.kolListService.remove(id);
  }

  @Delete()
  @Permissions('kol:batch:delete')
  @ApiOperation({
    summary: '批量删除KOL',
    description: '根据ID列表批量删除KOL',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'number' },
          description: 'KOL ID列表',
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
    this.logger.log(`批量删除KOL: IDs ${JSON.stringify(ids)}`);
    return await this.kolListService.removeBatch(ids);
  }
}
