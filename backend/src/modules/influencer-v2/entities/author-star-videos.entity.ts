import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 星图视频数据表（90天）
 * 作品层 - 低频访问
 */
@Entity('authors_star_videos_90d', { database: 'crawler_db_v2' })
export class AuthorStarVideos {
  @PrimaryColumn({ type: 'text' })
  author_id: string;

  @Column({ type: 'bigint', nullable: true })
  star_video_cnt_90d: number;

  @Column({ type: 'double precision', nullable: true })
  star_video_interact_rate_90d: number;

  @Column({ type: 'double precision', nullable: true })
  star_video_finish_vv_rate_90d: number;

  @Column({ type: 'bigint', nullable: true })
  star_video_median_vv_90d: number;

  @Column({ type: 'bigint', nullable: true })
  star_video_install_ge_1_cnt_90d: number;

  @Column({ type: 'bigint', nullable: true })
  star_item_count_within_30d: number;

  @Column({ type: 'bigint', nullable: true })
  star_component_link_click_cnt_90d: number;

  @Column({ type: 'bigint', nullable: true })
  star_component_install_finish_cnt_90d: number;

  // 计算字段
  @Column({ type: 'boolean', default: false })
  is_active_creator: boolean;

  @Column({ type: 'double precision', nullable: true })
  video_activity_score: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
