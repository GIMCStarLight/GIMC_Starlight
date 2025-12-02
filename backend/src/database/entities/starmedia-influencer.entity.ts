import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('starmedia_influencer_info')
export class StarmediaInfluencer {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'integer', unique: true, name: 'influencer_serial_number' })
  influencerSerialNumber: number;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'account_id' })
  accountId: string;

  @Column({ type: 'varchar', length: 100 })
  nickname: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'influencer_overview' })
  influencerOverview: string;

  @Column({ type: 'varchar', length: 100, default: '省广星媒', name: 'affiliated_organization' })
  affiliatedOrganization: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'influencer_category' })
  influencerCategory: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'total_fans' })
  totalFans: number;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'contract_status' })
  contractStatus: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'contract_period' })
  contractPeriod: string;

  @Column({ type: 'date', nullable: true, name: 'contract_start_date' })
  contractStartDate: Date;

  @Column({ type: 'date', nullable: true, name: 'contract_end_date' })
  contractEndDate: Date;

  @Column({ type: 'integer', nullable: true, name: 'contract_months' })
  contractMonths: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'contract_rebate_rate' })
  contractRebateRate: number;

  @Column({ type: 'text', nullable: true, name: 'platform_accounts' })
  platformAccounts: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'all_platforms' })
  allPlatforms: string;

  @Column({ type: 'text', nullable: true, name: 'status_remarks' })
  statusRemarks: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
