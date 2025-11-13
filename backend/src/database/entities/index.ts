// 用户相关实体
import { UserAuth } from './user-auth.entity';
import { UserProfile } from './user-profile.entity';

// 权限相关实体
import { Permission } from './permission.entity';
import { Role } from './role.entity';

// 关联关系实体
import { RolePermission } from './role-permission.entity';
import { UserRole } from './user-role.entity';

// 标签相关实体
import { Tag } from './tag.entity';

// SQLBot配置实体
import { SqlbotConfig } from '../../modules/sqlbot/entities/sqlbot-config.entity';

// 达人数据实体
import { KolList } from './kol-list.entity';
import { KolPrivateMatches } from './kol-private-matches.entity';
import { KolMatchLogs } from './kol-match-logs.entity';

// 供应商数据库实体
import { SupplierDatabase } from './supplier-database.entity';

// KOL评论实体
import { KolReviews } from './kol-reviews.entity';

// 导出所有实体
export * from './kol-list.entity';
export * from './kol-private-matches.entity';
export * from './kol-match-logs.entity';
export * from './permission.entity';
export * from './role-permission.entity';
export * from './role.entity';
export * from './tag.entity';
export * from './user-auth.entity';
export * from './user-profile.entity';
export * from './user-role.entity';
export * from '../../modules/sqlbot/entities/sqlbot-config.entity';
export * from './supplier-database.entity';
export * from './kol-reviews.entity';
export * from './author-raw-archive.entity';

// 实体数组，用于TypeORM配置
export const RBAC_ENTITIES = [
  UserAuth,
  UserProfile,
  Permission,
  Role,
  RolePermission,
  UserRole,
  Tag,
  KolList,
  KolPrivateMatches,
  KolMatchLogs,
  SqlbotConfig,
  SupplierDatabase,
  // KolReviews 移至 PostgreSQL 连接，不在 MySQL 中使用
];
