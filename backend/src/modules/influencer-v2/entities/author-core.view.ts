import { ViewEntity, ViewColumn } from 'typeorm';

/**
 * 作者核心视图实体 - 映射到爬虫数据库的v_authors_core视图
 * 基于统一方案设计文档，使用author_dimension表作为数据源
 */
@ViewEntity({
  name: 'v_authors_core',
  database: 'crawler_db_v2',
  synchronize: false, // 视图不需要同步
})
export class AuthorCoreView {
  @ViewColumn()
  author_id: string;

  @ViewColumn()
  star_id: string;

  // 基础信息
  @ViewColumn()
  nick_name: string;

  @ViewColumn()
  avatar_uri: string;

  @ViewColumn()
  gender: string;

  @ViewColumn()
  city: string;

  @ViewColumn()
  province: string;

  @ViewColumn()
  author_type: number;

  @ViewColumn()
  author_status: number;

  @ViewColumn()
  grade: number;

  // 粉丝相关指标
  @ViewColumn()
  follower: number;

  @ViewColumn()
  fans_increment_within_15d: number;

  @ViewColumn()
  fans_increment_within_30d: number;

  @ViewColumn()
  fans_increment_rate_within_15d: number;

  // 互动相关指标
  @ViewColumn()
  interact_rate_within_30d: number;

  @ViewColumn()
  play_over_rate_within_30d: number;

  @ViewColumn()
  vv_median_30d: number;

  // 短视频相关指标
  @ViewColumn()
  sn_interact_rate_within_30d: number;

  @ViewColumn()
  sn_play_over_rate_within_30d: number;

  // 价格相关
  @ViewColumn()
  price_1_20: number;

  @ViewColumn()
  price_20_60: number;

  @ViewColumn()
  price_60: number;

  @ViewColumn()
  assign_cpm_suggest_price: number;

  @ViewColumn()
  promotion_prospective_vv: number;

  @ViewColumn()
  promotion_prospective_20_60_cpm: number;

  @ViewColumn()
  promotion_prospective_60_cpm: number;

  // 链路指标
  @ViewColumn()
  link_convert_index: number;

  @ViewColumn()
  link_shopping_index: number;

  @ViewColumn()
  link_spread_index: number;

  @ViewColumn()
  link_star_index: number;

  // 电商相关
  @ViewColumn()
  e_commerce_enable: boolean;

  @ViewColumn()
  author_ecom_level: string;

  @ViewColumn()
  ecom_gmv_30d_range: string;

  @ViewColumn()
  ecom_avg_order_value_30d_range: string;

  @ViewColumn()
  ecom_gpm_30d_range: string;

  @ViewColumn()
  star_ecom_video_num_30d: number;

  // 业务标签
  @ViewColumn()
  star_excellent_author: boolean;

  @ViewColumn()
  is_black_horse_author: boolean;

  @ViewColumn()
  is_cocreate_author: boolean;

  @ViewColumn()
  is_cpm_project_author: boolean;

  @ViewColumn()
  is_short_drama: boolean;

  @ViewColumn()
  is_ad_star_cur_high_quality_author: boolean;

  @ViewColumn()
  star_qianchuan_high_potential: boolean;

  // 其他指标
  @ViewColumn()
  avg_search_after_view_rate_30d: number;

  @ViewColumn()
  burst_text_rate: number;

  @ViewColumn()
  updated_at: Date;

  // 计算字段
  @ViewColumn()
  primary_industry: string | null;

  @ViewColumn({ name: 'content_tags_top3' })
  content_tags_top3: unknown;

  @ViewColumn({ name: 'unified_task_price_list' })
  unified_task_price_list: unknown;

  @ViewColumn({ name: 'extra' })
  extra: unknown;

  // 计算属性：影响力等级
  get influencer_tier(): 'mega' | 'macro' | 'micro' | 'nano' {
    if (this.follower >= 10000000) {
      return 'mega';
    } else if (this.follower >= 1000000) {
      return 'macro';
    } else if (this.follower >= 100000) {
      return 'micro';
    } else {
      return 'nano';
    }
  }

  // 别名字段
  get follower_count(): number {
    return this.follower;
  }

  // 计算属性：格式化粉丝数
  get formattedFollowerCount(): string {
    if (this.follower_count >= 1000000) {
      return `${(this.follower_count / 1000000).toFixed(1)}M`;
    } else if (this.follower_count >= 1000) {
      return `${(this.follower_count / 1000).toFixed(1)}K`;
    }
    return this.follower_count.toString();
  }

  // 计算属性：性别文本
  get genderText(): string {
    return this.gender || '未知';
  }

  // 计算属性：影响力等级文本
  get influencerTierText(): string {
    switch (this.influencer_tier) {
      case 'mega':
        return '超级网红';
      case 'macro':
        return '头部网红';
      case 'micro':
        return '腰部网红';
      case 'nano':
        return '尾部网红';
      default:
        return '未分类';
    }
  }

  // 计算属性：地理位置
  get location(): string {
    if (this.province && this.city) {
      return `${this.province}${this.city}`;
    } else if (this.province) {
      return this.province;
    } else if (this.city) {
      return this.city;
    }
    return '未知';
  }
}
