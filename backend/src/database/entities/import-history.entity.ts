import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ImportDataType {
  PRIVATE = 'private',
  PUBLIC = 'public',
}

@Entity('import_history')
@Index(['task_id'])
@Index(['status'])
@Index(['created_at'])
export class ImportHistory {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  task_id: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  file_name: string;

  @Column({ type: 'varchar', length: 50, default: 'private' })
  data_type: string;

  @Column({ type: 'int', default: 0 })
  total_rows: number;

  @Column({ type: 'int', default: 0 })
  processed_rows: number;

  @Column({ type: 'int', default: 0 })
  success_count: number;

  @Column({ type: 'int', default: 0 })
  failed_count: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ImportStatus;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'timestamp', nullable: true })
  start_time: Date;

  @Column({ type: 'timestamp', nullable: true })
  end_time: Date;

  @Column({ type: 'int', nullable: true })
  duration: number;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'jsonb', nullable: true })
  failed_records: any;

  @Column({ type: 'bigint', nullable: true })
  created_by: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
