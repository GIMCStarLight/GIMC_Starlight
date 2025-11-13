import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Tag } from '../../database/entities/tag.entity';

/**
 * 标签响应DTO
 */
export class TagResponseDto {
  @ApiProperty({ description: '标签ID', example: 1 })
  id: number;

  @ApiProperty({ description: '标签名称', example: '美食' })
  name: string;

  @ApiPropertyOptional({ description: '标签代码', example: 'food' })
  code?: string;

  @ApiPropertyOptional({ description: '标签描述', example: '美食相关内容标签' })
  description?: string;

  @ApiProperty({ description: '所属平台', example: '星图' })
  platform: string;

  @ApiProperty({ description: '层级深度', example: 1 })
  level: number;

  @ApiPropertyOptional({ description: '父级标签ID', example: null })
  parentId?: number | null;

  @ApiProperty({ description: '排序权重', example: 0 })
  sort: number;

  @ApiProperty({ description: '是否启用', example: true })
  isActive: boolean;

  @ApiPropertyOptional({
    description: '扩展属性',
    example: { color: '#ff0000', icon: 'food-icon' },
  })
  metadata?: Record<string, any>;

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: '父级标签信息' })
  parent?: TagResponseDto;

  @ApiPropertyOptional({ description: '子标签列表', type: [TagResponseDto] })
  children?: TagResponseDto[];

  @ApiPropertyOptional({
    description: '完整路径',
    example: '生活 > 美食 > 中餐',
  })
  fullPath?: string;

  @ApiPropertyOptional({ description: '是否为根节点', example: false })
  isRoot?: boolean;

  @ApiPropertyOptional({ description: '是否为叶子节点', example: true })
  isLeaf?: boolean;

  constructor(tag: Tag) {
    this.id = tag.id;
    this.name = tag.name;
    this.code = tag.code;
    this.description = tag.description;
    this.platform = tag.platform;
    this.level = tag.level;
    this.parentId = tag.parentId;
    this.sort = tag.sort;
    this.isActive = tag.isActive;
    this.metadata = tag.metadata;
    this.createdAt = tag.createdAt;
    this.updatedAt = tag.updatedAt;

    // 如果有父级标签，转换为DTO
    if (tag.parent) {
      this.parent = new TagResponseDto(tag.parent);
    }

    // 如果有子标签，转换为DTO数组
    if (tag.children && tag.children.length > 0) {
      this.children = tag.children.map((child) => new TagResponseDto(child));
    }

    // 计算衍生属性
    this.fullPath = tag.getFullPath();
    this.isRoot = tag.isRoot();
    this.isLeaf = tag.isLeaf();
  }
}

/**
 * 分页标签响应DTO
 */
export class PaginatedTagResponseDto {
  @ApiProperty({ description: '标签列表', type: [TagResponseDto] })
  data: TagResponseDto[];

  @ApiProperty({ description: '总数量', example: 100 })
  total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页数量', example: 10 })
  limit: number;

  @ApiProperty({ description: '总页数', example: 10 })
  totalPages: number;

  @ApiProperty({ description: '是否有下一页', example: true })
  hasNext: boolean;

  @ApiProperty({ description: '是否有上一页', example: false })
  hasPrev: boolean;

  constructor(data: Tag[], total: number, page: number, limit: number) {
    this.data = data.map((tag) => new TagResponseDto(tag));
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
    this.hasNext = page < this.totalPages;
    this.hasPrev = page > 1;
  }
}

/**
 * 标签树响应DTO
 */
export class TagTreeResponseDto extends TagResponseDto {
  @ApiPropertyOptional({ description: '子标签树', type: [TagTreeResponseDto] })
  declare children?: TagTreeResponseDto[];

  constructor(tag: Tag) {
    super(tag);

    // 递归构建子标签树
    if (tag.children && tag.children.length > 0) {
      this.children = tag.children.map(
        (child) => new TagTreeResponseDto(child),
      );
    }
  }
}
