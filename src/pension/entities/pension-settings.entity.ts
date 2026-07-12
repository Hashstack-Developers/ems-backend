import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('pension_settings')
export class PensionSettings {
  @PrimaryColumn({ default: 1 })
  id: number;

  @Column({ name: 'employee_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  employeeRate: number;

  @Column({ name: 'employer_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  employerRate: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
