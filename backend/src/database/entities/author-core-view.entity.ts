import { ViewEntity, ViewColumn } from 'typeorm';

/**
 * 作者核心视图实体
 * 映射 crawler_db 数据库中的 v_authors_core 视图
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

  @ViewColumn()
  nick_name: string;

  @ViewColumn()
  avatar_uri: string;

  @ViewColumn()
  gender: number;

  @ViewColumn()
  city: string;

  @ViewColumn()
  province: string;

  @ViewColumn()
  author_type: string;

  @ViewColumn()
  author_status: string;

  @ViewColumn()
  grade: string;

  @ViewColumn()
  follower: number;

  @ViewColumn()
  updated_at: Date;

  // 新增缺失的字段映射
  @ViewColumn()
  fans_increment_within_15d: number;

  @ViewColumn()
  fans_increment_within_30d: number;

  @ViewColumn()
  fans_increment_rate_within_15d: number;

  @ViewColumn()
  interact_rate_within_30d: number;

  @ViewColumn()
  play_over_rate_within_30d: number;

  @ViewColumn()
  vv_median_30d: number;

  @ViewColumn()
  sn_interact_rate_within_30d: number;

  @ViewColumn()
  sn_play_over_rate_within_30d: number;

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

  @ViewColumn()
  link_convert_index: number;

  @ViewColumn()
  link_shopping_index: number;

  @ViewColumn()
  link_spread_index: number;

  @ViewColumn()
  link_star_index: number;

  @ViewColumn()
  e_commerce_enable: boolean;

  @ViewColumn()
  author_ecom_level: string;

  @ViewColumn()
  ecom_gmv_30d_range: any;

  @ViewColumn()
  ecom_avg_order_value_30d_range: any;

  @ViewColumn()
  ecom_gpm_30d_range: any;

  @ViewColumn()
  star_ecom_video_num_30d: number;

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

  @ViewColumn()
  avg_search_after_view_rate_30d: number;

  @ViewColumn()
  burst_text_rate: number;

  @ViewColumn()
  primary_industry: string;

  @ViewColumn()
  content_tags_top3: any;

  @ViewColumn()
  unified_task_price_list: any;

  @ViewColumn()
  extra: any;

  // 计算属性：格式化粉丝数
  get formattedFollowerCount(): string {
    if (this.follower >= 1000000) {
      return `${(this.follower / 1000000).toFixed(1)}M`;
    } else if (this.follower >= 1000) {
      return `${(this.follower / 1000).toFixed(1)}K`;
    }
    return this.follower.toString();
  }

  // 计算属性：性别文本
  get genderText(): string {
    switch (this.gender) {
      case 1:
        return '男';
      case 2:
        return '女';
      default:
        return '未知';
    }
  }

  // 计算属性：影响力等级文本
  get influencerTierText(): string {
    switch (this.author_type) {
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
