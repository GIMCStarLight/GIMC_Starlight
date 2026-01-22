import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('starlink_influencer_info')
export class StarlinkInfluencer {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'integer', unique: true, name: 'kol_serial_number' })
  kolSerialNumber: number;

  @Column({ type: 'varchar', length: 100, name: 'account_name' })
  nickname: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'home_link' })
  profileUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'star_platform_url' })
  starPlatformUrl: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'primary_platform' })
  primaryPlatform: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'category' })
  accountCategory: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'followers_w' })
  fansCount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'star_quote_1_20s' })
  price1To20s: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'star_quote_21_60s' })
  price21To60s: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'star_quote_60s_plus' })
  price60sPlus: number;

  @Column({ type: 'text', nullable: true, name: 'policy_tiers' })
  policyTiers: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'policy_tiers_summary' })
  policyTiersSummary: string;

  @Column({ type: 'boolean', default: false, name: 'has_guaranteed_metrics' })
  hasGuaranteedMetrics: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'min_rebate_rate' })
  minRebateRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'max_rebate_rate' })
  maxRebateRate: number;

  @Column({ type: 'text', nullable: true, name: 'policy_remarks' })
  policyRemarks: string;

  @Column({ type: 'integer', default: 0, name: 'current_order_count' })
  currentOrderCount: number;

  @Column({ type: 'text', nullable: true, name: 'kol_introduction' })
  kolIntroduction: string;

  @Column({ type: 'text', nullable: true, name: 'achievement_highlights' })
  achievementHighlights: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'ranking_info' })
  rankingInfo: string;

  @Column({ type: 'text', nullable: true, name: 'collaboration_platforms' })
  collaborationPlatforms: string;

  @Column({ type: 'text', nullable: true, name: 'distribution_platforms' })
  distributionPlatforms: string;

  @Column({ type: 'text', nullable: true, name: 'distribution_rules' })
  distributionRules: string;

  @Column({ type: 'text', nullable: true, name: 'special_benefits' })
  specialBenefits: string;

  @Column({ type: 'text', nullable: true, name: 'past_cooperation_brands' })
  pastCooperationBrands: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'cooperation_industries' })
  cooperationIndustries: string;

  @Column({ type: 'text', nullable: true, name: 'certifications' })
  certifications: string;

  @Column({ type: 'text', nullable: true, name: 'awards_honors' })
  awardsHonors: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'content_style' })
  contentStyle: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'target_audience' })
  targetAudience: string;

  @Column({ type: 'text', nullable: true, name: 'content_advantages' })
  contentAdvantages: string;

  @Column({ type: 'text', nullable: true, name: 'related_accounts' })
  relatedAccounts: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'account_matrix' })
  accountMatrix: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'all_platforms' })
  allPlatforms: string;

  @Column({ type: 'integer', default: 0, name: 'second_half_order_count' })
  secondHalfOrderCount: number;

  @Column({ type: 'text', nullable: true, name: 'remarks' })
  remarks: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
