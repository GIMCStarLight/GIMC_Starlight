import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, Like, IsNull } from 'typeorm';
import { Tag } from '../database/entities/tag.entity';
import {
  CreateTagDto,
  UpdateTagDto,
  QueryTagDto,
  TagResponseDto,
  PaginatedTagResponseDto,
  TagTreeResponseDto,
} from './dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag, 'postgres')
    private readonly tagRepository: Repository<Tag>,
  ) {}

  /**
   * 创建标签
   */
  async create(createTagDto: CreateTagDto): Promise<TagResponseDto> {
    const { parentId, ...tagData } = createTagDto;

    // 如果有父级标签，验证父级标签是否存在并计算层级
    let level = 1;
    let parent: Tag | null = null;

    if (parentId) {
      parent = await this.tagRepository.findOne({
        where: { id: parentId },
        relations: ['parent'],
      });

      if (!parent) {
        throw new NotFoundException(`父级标签 ID ${parentId} 不存在`);
      }

      // 验证平台一致性
      if (parent.platform !== tagData.platform) {
        throw new BadRequestException('子标签的平台必须与父标签保持一致');
      }

      level = parent.level + 1;
    }

    // 检查同级标签名称是否重复
    const existingTag = await this.tagRepository.findOne({
      where: {
        name: tagData.name,
        platform: tagData.platform,
        parentId: parentId || IsNull(),
      },
    });

    if (existingTag) {
      throw new BadRequestException(
        `同级标签中已存在名称为 "${tagData.name}" 的标签`,
      );
    }

    // 创建标签
    const tag = this.tagRepository.create({
      ...tagData,
      parentId,
      level,
    });

    const savedTag = await this.tagRepository.save(tag);

    // 返回完整的标签信息
    return this.findOne(savedTag.id);
  }

  /**
   * 分页查询标签
   */
  async findAll(queryDto: QueryTagDto): Promise<PaginatedTagResponseDto> {
    const {
      page = 1,
      limit = 10,
      name,
      platform,
      parentId,
      level,
      isActive,
      sortBy = 'sort',
      sortOrder = 'ASC',
      includeChildren = false,
      rootOnly = false,
    } = queryDto;

    // 添加调试日志
    console.log('TagsService.findAll - 接收到的查询参数:', {
      page,
      limit,
      name,
      platform,
      parentId,
      level,
      isActive,
      sortBy,
      sortOrder,
      includeChildren,
      rootOnly,
    });
    console.log('isActive 类型:', typeof isActive, '值:', isActive);
    console.log('platform 类型:', typeof platform, '值:', platform);

    const queryBuilder = this.tagRepository.createQueryBuilder('tag');

    // 条件筛选
    if (name) {
      console.log('添加名称筛选条件:', name);
      queryBuilder.andWhere('tag.name LIKE :name', { name: `%${name}%` });
    }

    if (platform) {
      console.log('添加平台筛选条件:', platform);
      queryBuilder.andWhere('tag.platform = :platform', { platform });
    }

    if (parentId !== undefined) {
      console.log('添加父级ID筛选条件:', parentId);
      queryBuilder.andWhere('tag.parentId = :parentId', { parentId });
    }

    if (level !== undefined) {
      console.log('添加层级筛选条件:', level);
      queryBuilder.andWhere('tag.level = :level', { level });
    }

    if (isActive !== undefined) {
      console.log('添加状态筛选条件:', isActive, typeof isActive);
      queryBuilder.andWhere('tag.isActive = :isActive', { isActive });
    }

    if (rootOnly) {
      console.log('添加根级标签筛选条件');
      queryBuilder.andWhere('tag.parentId IS NULL');
    }

    // 关联查询
    if (includeChildren) {
      queryBuilder.leftJoinAndSelect('tag.children', 'children');
    }
    queryBuilder.leftJoinAndSelect('tag.parent', 'parent');

    // 排序
    queryBuilder.orderBy(`tag.${sortBy}`, sortOrder);

    // 分页
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // 打印生成的SQL查询
    console.log('生成的SQL查询:', queryBuilder.getSql());
    console.log('查询参数:', queryBuilder.getParameters());

    const [tags, total] = await queryBuilder.getManyAndCount();

    console.log('查询结果数量:', tags.length, '总数:', total);
    console.log(
      '前3个结果:',
      tags.slice(0, 3).map((tag) => ({
        id: tag.id,
        name: tag.name,
        platform: tag.platform,
        isActive: tag.isActive,
      })),
    );

    return new PaginatedTagResponseDto(tags, total, page, limit);
  }

  /**
   * 获取标签树（层级结构）
   */
  async getTagTree(filters?: {
    platform?: string;
    name?: string;
    isActive?: boolean;
  }): Promise<TagTreeResponseDto[]> {
    const { platform, name, isActive } = filters || {};

    const queryBuilder = this.tagRepository
      .createQueryBuilder('tag')
      .leftJoinAndSelect('tag.children', 'children')
      .leftJoinAndSelect('children.children', 'grandChildren')
      .leftJoinAndSelect('grandChildren.children', 'greatGrandChildren')
      .where('tag.parentId IS NULL')
      .orderBy('tag.sort', 'ASC')
      .addOrderBy('children.sort', 'ASC')
      .addOrderBy('grandChildren.sort', 'ASC')
      .addOrderBy('greatGrandChildren.sort', 'ASC');

    // 平台筛选
    if (platform) {
      queryBuilder.andWhere('tag.platform = :platform', { platform });
    }

    // 状态筛选 - 修复：只有当明确传入isActive参数时才进行筛选，否则显示所有状态
    if (isActive !== undefined) {
      queryBuilder.andWhere('tag.isActive = :isActive', { isActive });
    }

    // 名称筛选 - 如果有名称筛选，需要在整个树中搜索
    if (name) {
      // 先获取所有匹配名称的标签（包括子标签）
      const matchingTagsQuery = this.tagRepository
        .createQueryBuilder('matchTag')
        .select('matchTag.id')
        .where('matchTag.name LIKE :name', { name: `%${name}%` });

      if (platform) {
        matchingTagsQuery.andWhere('matchTag.platform = :platform', {
          platform,
        });
      }

      // 状态筛选 - 修复：只有当明确传入isActive参数时才进行筛选
      if (isActive !== undefined) {
        matchingTagsQuery.andWhere('matchTag.isActive = :isActive', {
          isActive,
        });
      }

      const matchingTagIds = await matchingTagsQuery.getRawMany();
      const tagIds = matchingTagIds.map((tag) => tag.matchTag_id);

      if (tagIds.length === 0) {
        return [];
      }

      // 获取这些标签的所有祖先ID
      const ancestorIds = new Set<number>();
      for (const tagId of tagIds) {
        const ancestors = await this.getAncestorIds(tagId);
        ancestors.forEach((id) => ancestorIds.add(id));
        ancestorIds.add(tagId);
      }

      // 只返回包含匹配标签或其祖先的树结构
      queryBuilder.andWhere('tag.id IN (:...ancestorIds)', {
        ancestorIds: Array.from(ancestorIds),
      });
    }

    const rootTags = await queryBuilder.getMany();

    // 如果有名称筛选，需要过滤子标签树
    if (name) {
      return rootTags.map((tag) =>
        this.filterTreeByName(new TagTreeResponseDto(tag), name),
      );
    }

    return rootTags.map((tag) => new TagTreeResponseDto(tag));
  }

  /**
   * 获取标签的所有祖先ID
   */
  private async getAncestorIds(tagId: number): Promise<number[]> {
    const ancestorIds: number[] = [];

    const tag = await this.tagRepository.findOne({
      where: { id: tagId },
      select: ['parentId'],
    });

    if (tag && tag.parentId) {
      ancestorIds.push(tag.parentId);
      const parentAncestors = await this.getAncestorIds(tag.parentId);
      ancestorIds.push(...parentAncestors);
    }

    return ancestorIds;
  }

  /**
   * 根据名称过滤树结构
   */
  private filterTreeByName(
    tree: TagTreeResponseDto,
    name: string,
  ): TagTreeResponseDto {
    const filtered = { ...tree };

    if (tree.children && tree.children.length > 0) {
      filtered.children = tree.children
        .map((child) => this.filterTreeByName(child, name))
        .filter(
          (child) =>
            child.name.includes(name) ||
            (child.children && child.children.length > 0),
        );
    }

    return filtered;
  }

  /**
   * 根据ID查询单个标签
   */
  async findOne(id: number): Promise<TagResponseDto> {
    const tag = await this.tagRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!tag) {
      throw new NotFoundException(`标签 ID ${id} 不存在`);
    }

    return new TagResponseDto(tag);
  }

  /**
   * 更新标签
   */
  async update(
    id: number,
    updateTagDto: UpdateTagDto,
  ): Promise<TagResponseDto> {
    const tag = await this.tagRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!tag) {
      throw new NotFoundException(`标签 ID ${id} 不存在`);
    }

    const { parentId, ...restUpdateData } = updateTagDto;

    // 构建最终的更新数据对象，明确包含可能的parentId和level属性
    const updateData: Partial<UpdateTagDto> & {
      parentId?: number | null;
      level?: number;
    } = { ...restUpdateData };

    // 如果要更新父级标签
    if (parentId !== undefined) {
      if (parentId === id) {
        throw new BadRequestException('标签不能设置自己为父级标签');
      }

      // 检查是否会形成循环引用
      if (parentId && (await this.wouldCreateCycle(id, parentId))) {
        throw new BadRequestException('更新父级标签会形成循环引用');
      }

      // 验证新父级标签
      let newLevel = 1;
      if (parentId) {
        const parentTag = await this.tagRepository.findOne({
          where: { id: parentId },
        });
        if (!parentTag) {
          throw new NotFoundException(`父级标签 ID ${parentId} 不存在`);
        }

        // 验证平台一致性
        if (updateData.platform && parentTag.platform !== updateData.platform) {
          throw new BadRequestException('子标签的平台必须与父标签保持一致');
        }

        newLevel = parentTag.level + 1;
      }

      // 将parentId和level添加到更新数据中
      updateData.parentId = parentId;
      updateData.level = newLevel;

      // 更新所有子标签的层级
      await this.updateChildrenLevels(id, newLevel);
    }

    // 检查同级标签名称是否重复
    if (updateData.name) {
      const finalParentId = parentId !== undefined ? parentId : tag.parentId;
      const existingTag = await this.tagRepository.findOne({
        where: {
          name: updateData.name,
          platform: updateData.platform || tag.platform,
          parentId: finalParentId === null ? IsNull() : finalParentId,
          id: { $ne: id } as any,
        },
      });

      if (existingTag) {
        throw new BadRequestException(
          `同级标签中已存在名称为 "${updateData.name}" 的标签`,
        );
      }
    }

    // 过滤掉undefined的字段，避免覆盖原有值
    const filteredUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([key, value]) => value !== undefined),
    );

    // 使用update方法直接更新数据库
    await this.tagRepository.update(id, filteredUpdateData);

    return this.findOne(id);
  }

  /**
   * 删除标签
   */
  async remove(id: number): Promise<void> {
    const tag = await this.tagRepository.findOne({
      where: { id },
      relations: ['children'],
    });

    if (!tag) {
      throw new NotFoundException(`标签 ID ${id} 不存在`);
    }

    // 检查是否有子标签
    if (tag.children && tag.children.length > 0) {
      throw new BadRequestException(
        '不能删除有子标签的标签，请先删除或移动子标签',
      );
    }

    await this.tagRepository.remove(tag);
  }

  /**
   * 批量删除标签
   */
  async removeMany(ids: number[]): Promise<void> {
    for (const id of ids) {
      await this.remove(id);
    }
  }

  /**
   * 移动标签到新的父级
   */
  async moveTag(
    id: number,
    newParentId: number | null,
  ): Promise<TagResponseDto> {
    return this.update(id, { parentId: newParentId || undefined });
  }

  /**
   * 获取标签的所有祖先
   */
  async getAncestors(id: number): Promise<TagResponseDto[]> {
    const tag = await this.tagRepository.findOne({
      where: { id },
      relations: ['parent'],
    });

    if (!tag) {
      throw new NotFoundException(`标签 ID ${id} 不存在`);
    }

    const ancestors: Tag[] = [];
    let current = tag.parent;

    while (current) {
      ancestors.unshift(current);
      current = current.parentId
        ? await this.tagRepository.findOne({
            where: { id: current.parentId },
            relations: ['parent'],
          })
        : null;
    }

    return ancestors.map((ancestor) => new TagResponseDto(ancestor));
  }

  /**
   * 获取标签的所有后代
   */
  async getDescendants(id: number): Promise<TagResponseDto[]> {
    const descendants: Tag[] = [];

    const collectDescendants = async (parentId: number) => {
      const children = await this.tagRepository.find({
        where: { parentId },
        relations: ['children'],
      });

      for (const child of children) {
        descendants.push(child);
        await collectDescendants(child.id);
      }
    };

    await collectDescendants(id);

    return descendants.map((descendant) => new TagResponseDto(descendant));
  }

  /**
   * 检查是否会形成循环引用
   */
  private async wouldCreateCycle(
    tagId: number,
    newParentId: number,
  ): Promise<boolean> {
    let currentId = newParentId;

    while (currentId) {
      if (currentId === tagId) {
        return true;
      }

      const parent = await this.tagRepository.findOne({
        where: { id: currentId },
        select: ['parentId'],
      });

      currentId = parent?.parentId || 0;
      if (currentId === 0) break; // 如果parentId为null或0，结束循环
    }

    return false;
  }

  /**
   * 更新子标签的层级
   */
  private async updateChildrenLevels(
    parentId: number,
    parentLevel: number,
  ): Promise<void> {
    const children = await this.tagRepository.find({
      where: { parentId },
    });

    for (const child of children) {
      const newLevel = parentLevel + 1;
      await this.tagRepository.update(child.id, { level: newLevel });
      await this.updateChildrenLevels(child.id, newLevel);
    }
  }
}
