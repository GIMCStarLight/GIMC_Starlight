import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('sqlbot_configs')
export class SqlbotConfig {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: '配置ID' })
  id: string;

  @Column({ type: 'varchar', length: 255, comment: 'SQLBot域名' })
  @ApiProperty({ description: 'SQLBot域名' })
  domain: string;

  @Column({ type: 'varchar', length: 100, comment: '基础应用助手ID' })
  @ApiProperty({ description: '基础应用助手ID' })
  baseAssistantId: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '高级应用助手ID',
    nullable: true,
  })
  @ApiProperty({ description: '高级应用助手ID', required: false })
  advancedAssistantId?: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '嵌入式应用ID',
    nullable: true,
  })
  @ApiProperty({ description: '嵌入式应用ID', required: false })
  embeddedAppId?: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: '嵌入式应用密钥',
    nullable: true,
  })
  @ApiProperty({ description: '嵌入式应用密钥', required: false })
  embeddedAppSecret?: string;

  @Column({ type: 'boolean', default: false, comment: '是否启用AES加密' })
  @ApiProperty({ description: '是否启用AES加密' })
  aesEnable: boolean;

  @Column({
    type: 'varchar',
    length: 64,
    comment: 'AES加密密钥',
    nullable: true,
  })
  @ApiProperty({ description: 'AES加密密钥', required: false })
  aesKey?: string;

  @Column({ type: 'boolean', default: true, comment: '是否启用' })
  @ApiProperty({ description: '是否启用' })
  enabled: boolean;

  @CreateDateColumn({ comment: '创建时间' })
  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}
