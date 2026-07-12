import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('allowance_settings')
export class AllowanceSettings {
  @PrimaryColumn({ default: 1 })
  id: number;

  @Column({ name: 'welfare_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  welfareRate: number;

  @Column({ name: 'management_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  managementRate: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
