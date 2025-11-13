import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TagsService } from './tags.service';
import {
  CreateTagDto,
  UpdateTagDto,
  QueryTagDto,
  TagResponseDto,
  PaginatedTagResponseDto,
  TagTreeResponseDto,
} from './dto';

@ApiTags('标签管理')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @ApiOperation({ summary: '创建标签' })
  @ApiResponse({
    status: 201,
    description: '标签创建成功',
    type: TagResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '父级标签不存在' })
  async create(@Body() createTagDto: CreateTagDto): Promise<TagResponseDto> {
    return this.tagsService.create(createTagDto);
  }

  @Get()
  @ApiOperation({ summary: '分页查询标签列表' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: PaginatedTagResponseDto,
  })
  async findAll(@Query() queryDto: any): Promise<PaginatedTagResponseDto> {
    // 添加调试日志
    console.log('TagsController.findAll - 原始查询参数:', queryDto);

    // 手动转换参数
    const transformedQuery: QueryTagDto = {
      page: queryDto.page ? parseInt(queryDto.page, 10) : 1,
      limit: queryDto.limit ? parseInt(queryDto.limit, 10) : 20,
      name: queryDto.name,
      platform: queryDto.platform,
      sortBy: queryDto.sortBy || 'sort',
      sortOrder: queryDto.sortOrder || 'ASC',
    };

    // 转换布尔值参数
    if (queryDto.isActive !== undefined) {
      if (queryDto.isActive === 'true' || queryDto.isActive === '1') {
        transformedQuery.isActive = true;
      } else if (queryDto.isActive === 'false' || queryDto.isActive === '0') {
        transformedQuery.isActive = false;
      } else {
        transformedQuery.isActive = queryDto.isActive;
      }
    }

    // 转换数字参数
    if (queryDto.parentId !== undefined && queryDto.parentId !== '') {
      transformedQuery.parentId = parseInt(queryDto.parentId, 10);
    }
    if (queryDto.level !== undefined && queryDto.level !== '') {
      transformedQuery.level = parseInt(queryDto.level, 10);
    }

    // 转换布尔值参数
    if (queryDto.includeChildren !== undefined) {
      if (
        queryDto.includeChildren === 'true' ||
        queryDto.includeChildren === '1'
      ) {
        transformedQuery.includeChildren = true;
      } else if (
        queryDto.includeChildren === 'false' ||
        queryDto.includeChildren === '0'
      ) {
        transformedQuery.includeChildren = false;
      } else {
        transformedQuery.includeChildren = queryDto.includeChildren;
      }
    }

    if (queryDto.rootOnly !== undefined) {
      if (queryDto.rootOnly === 'true' || queryDto.rootOnly === '1') {
        transformedQuery.rootOnly = true;
      } else if (queryDto.rootOnly === 'false' || queryDto.rootOnly === '0') {
        transformedQuery.rootOnly = false;
      } else {
        transformedQuery.rootOnly = queryDto.rootOnly;
      }
    }

    console.log('TagsController.findAll - 转换后的查询参数:', transformedQuery);
    console.log(
      'isActive 类型:',
      typeof transformedQuery.isActive,
      '值:',
      transformedQuery.isActive,
    );
    console.log(
      'platform 类型:',
      typeof transformedQuery.platform,
      '值:',
      transformedQuery.platform,
    );

    return this.tagsService.findAll(transformedQuery);
  }

  @Get('tree')
  @ApiOperation({ summary: '获取标签树结构' })
  @ApiQuery({
    name: 'platform',
    required: false,
    description: '平台筛选',
    enum: ['星图', '花火', '蒲公英'],
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: '标签名称筛选（模糊搜索）',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: '状态筛选',
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: [TagTreeResponseDto],
  })
  async getTree(
    @Query('platform') platform?: string,
    @Query('name') name?: string,
    @Query('isActive') isActive?: string,
  ): Promise<TagTreeResponseDto[]> {
    // 修复：正确处理布尔值参数
    let isActiveBool: boolean | undefined;
    if (isActive !== undefined && isActive !== null && isActive !== '') {
      isActiveBool = isActive === 'true' || isActive === '1';
    }

    return this.tagsService.getTagTree({
      platform,
      name,
      isActive: isActiveBool,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '根据ID查询标签详情' })
  @ApiParam({ name: 'id', description: '标签ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: TagResponseDto,
  })
  @ApiResponse({ status: 404, description: '标签不存在' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TagResponseDto> {
    return this.tagsService.findOne(id);
  }

  @Get(':id/ancestors')
  @ApiOperation({ summary: '获取标签的所有祖先' })
  @ApiParam({ name: 'id', description: '标签ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: [TagResponseDto],
  })
  @ApiResponse({ status: 404, description: '标签不存在' })
  async getAncestors(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TagResponseDto[]> {
    return this.tagsService.getAncestors(id);
  }

  @Get(':id/descendants')
  @ApiOperation({ summary: '获取标签的所有后代' })
  @ApiParam({ name: 'id', description: '标签ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: [TagResponseDto],
  })
  @ApiResponse({ status: 404, description: '标签不存在' })
  async getDescendants(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TagResponseDto[]> {
    return this.tagsService.getDescendants(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新标签' })
  @ApiParam({ name: 'id', description: '标签ID' })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    type: TagResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '标签不存在' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTagDto: UpdateTagDto,
  ): Promise<TagResponseDto> {
    return this.tagsService.update(id, updateTagDto);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: '移动标签到新的父级' })
  @ApiParam({ name: 'id', description: '标签ID' })
  @ApiQuery({
    name: 'parentId',
    required: false,
    description: '新的父级标签ID，null表示移动到根级',
  })
  @ApiResponse({
    status: 200,
    description: '移动成功',
    type: TagResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '标签不存在' })
  async moveTag(
    @Param('id', ParseIntPipe) id: number,
    @Query('parentId') parentId?: string,
  ): Promise<TagResponseDto> {
    const newParentId = parentId ? parseInt(parentId, 10) : null;
    return this.tagsService.moveTag(id, newParentId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除标签' })
  @ApiParam({ name: 'id', description: '标签ID' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 400, description: '不能删除有子标签的标签' })
  @ApiResponse({ status: 404, description: '标签不存在' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.tagsService.remove(id);
  }

  @Delete('batch')
  @ApiOperation({ summary: '批量删除标签' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMany(@Body('ids') ids: number[]): Promise<void> {
    return this.tagsService.removeMany(ids);
  }

  // 平台相关的便捷接口

  @Get('platform/:platform')
  @ApiOperation({ summary: '根据平台查询标签列表' })
  @ApiParam({
    name: 'platform',
    description: '平台名称',
    enum: ['星图', '花火', '蒲公英'],
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: PaginatedTagResponseDto,
  })
  async findByPlatform(
    @Param('platform') platform: string,
    @Query() queryDto: Omit<QueryTagDto, 'platform'>,
  ): Promise<PaginatedTagResponseDto> {
    return this.tagsService.findAll({ ...queryDto, platform });
  }

  @Get('platform/:platform/tree')
  @ApiOperation({ summary: '根据平台获取标签树结构' })
  @ApiParam({
    name: 'platform',
    description: '平台名称',
    enum: ['星图', '花火', '蒲公英'],
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: [TagTreeResponseDto],
  })
  async getTreeByPlatform(
    @Param('platform') platform: string,
  ): Promise<TagTreeResponseDto[]> {
    return this.tagsService.getTagTree({ platform });
  }

  @Get('platform/:platform/roots')
  @ApiOperation({ summary: '根据平台获取根级标签' })
  @ApiParam({
    name: 'platform',
    description: '平台名称',
    enum: ['星图', '花火', '蒲公英'],
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: PaginatedTagResponseDto,
  })
  async getRootsByPlatform(
    @Param('platform') platform: string,
    @Query() queryDto: Omit<QueryTagDto, 'platform' | 'rootOnly'>,
  ): Promise<PaginatedTagResponseDto> {
    return this.tagsService.findAll({ ...queryDto, platform, rootOnly: true });
  }
}
