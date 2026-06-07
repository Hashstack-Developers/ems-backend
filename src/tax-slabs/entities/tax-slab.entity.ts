import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SubTax } from './sub-tax.entity';

@Entity('tax_slabs')
export class TaxSlab {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'min_salary', type: 'decimal', precision: 12, scale: 2 })
  minSalary: number;

  @Column({
    name: 'max_salary',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  maxSalary: number | null;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2 })
  taxRate: number;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => SubTax, (subTax) => subTax.taxSlab, { cascade: true })
  subTaxes: SubTax[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
