import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

/**
 * 标签实体 - 支持多级层级结构
 * 用于存储社媒平台标签体系（星图、花火、蒲公英等）
 */
@Entity('tags')
@Index(['platform', 'level']) // 为平台和层级创建复合索引
@Index(['parentId']) // 为父级ID创建索引
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 标签名称
   */
  @Column({ type: 'varchar', length: 100, comment: '标签名称' })
  name: string;

  /**
   * 标签代码/标识符
   */
  @Column({ type: 'varchar', length: 50, nullable: true, comment: '标签代码' })
  code: string;

  /**
   * 标签描述
   */
  @Column({ type: 'text', nullable: true, comment: '标签描述' })
  description: string;

  /**
   * 所属平台（星图、花火、蒲公英等）
   */
  @Column({ type: 'varchar', length: 20, comment: '所属平台' })
  platform: string;

  /**
   * 层级深度（1-根节点，2-二级，以此类推）
   */
  @Column({ type: 'int', default: 1, comment: '层级深度' })
  level: number;

  /**
   * 父级标签ID（自引用外键）
   */
  @Column({ name: 'parent_id', type: 'int', nullable: true, comment: '父级标签ID' })
  parentId: number | null;

  /**
   * 排序权重
   */
  @Column({ type: 'int', default: 0, comment: '排序权重' })
  sort: number;

  /**
   * 是否启用
   */
  @Column({ name: 'is_active', type: 'boolean', default: true, comment: '是否启用' })
  isActive: boolean;

  /**
   * 扩展属性（JSON格式存储额外信息）
   */
  @Column({ type: 'json', nullable: true, comment: '扩展属性' })
  metadata: Record<string, any>;

  /**
   * 创建时间
   */
  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  /**
   * 更新时间
   */
  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;

  // 关联关系

  /**
   * 父级标签
   */
  @ManyToOne(() => Tag, (tag) => tag.children, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Tag | null;

  /**
   * 子级标签列表
   */
  @OneToMany(() => Tag, (tag) => tag.parent)
  children: Tag[];

  /**
   * 获取完整路径（从根节点到当前节点）
   */
  getFullPath(): string {
    const paths: string[] = [];
    let current: Tag | null = this;
    while (current) {
      paths.unshift(current.name);
      current = current.parent;
    }
    return paths.join(' > ');
  }

  /**
   * 判断是否为根节点
   */
  isRoot(): boolean {
    return this.parentId === null || this.parentId === undefined;
  }

  /**
   * 判断是否为叶子节点
   */
  isLeaf(): boolean {
    return !this.children || this.children.length === 0;
  }
}
