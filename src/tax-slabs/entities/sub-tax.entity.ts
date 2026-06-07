import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { TaxSlab } from './tax-slab.entity';

export enum SubTaxType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

@Entity('sub_taxes')
@Unique(['taxSlabId', 'code'])
export class SubTax {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tax_slab_id', type: 'int', nullable: true })
  taxSlabId: number | null;

  @ManyToOne(() => TaxSlab, (slab) => slab.subTaxes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tax_slab_id' })
  taxSlab: TaxSlab;

  @Column()
  name: string;

  @Column()
  code: string;

  @Column({ type: 'enum', enum: SubTaxType })
  type: SubTaxType;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, default: null })
  rate: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, default: null })
  amount: number | null;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
