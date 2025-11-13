/**
 * Entity导出文件
 * 统一导出所有实体类
 */

// 核心层
export * from './author-core.entity';
export * from './author-fans-metrics.entity';
export * from './author-engagement-metrics.entity';
export * from './author-pricing.entity';

// 营销层
export * from './author-marketing-indices.entity';
export * from './author-content-tags.entity';

// 电商层
export * from './author-ecommerce.entity';

// 作品层
export * from './author-star-videos.entity';
export * from './author-recent-works.entity';

// 垂直领域层
export * from './author-game-data.entity';
export * from './author-content-vertical.entity';
export * from './author-tool-vertical.entity';

// 品牌层
export * from './author-brand-boost.entity';

// 归档层
export * from './author-raw-archive.entity';
export * from './author-change-history.entity';

// 视图层
export * from './mv-authors-combined.entity';
