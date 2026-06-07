import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSubTaxDto } from './dto/create-sub-tax.dto';
import { CreateTaxSlabDto } from './dto/create-tax-slab.dto';
import { UpdateSubTaxDto } from './dto/update-sub-tax.dto';
import { UpdateTaxSlabDto } from './dto/update-tax-slab.dto';
import { SubTax, SubTaxType } from './entities/sub-tax.entity';
import { TaxSlab } from './entities/tax-slab.entity';

export interface TaxCalculationResult {
  taxSlab: TaxSlab | null;
  incomeTax: number;
  subTaxDeductions: Array<{
    subTax: SubTax;
    amount: number;
  }>;
  totalDeductions: number;
  netSalary: number;
}

@Injectable()
export class TaxSlabsService {
  constructor(
    @InjectRepository(TaxSlab)
    private readonly taxSlabsRepository: Repository<TaxSlab>,
    @InjectRepository(SubTax)
    private readonly subTaxesRepository: Repository<SubTax>,
  ) {}

  // --- Tax Slab CRUD ---

  async createTaxSlab(dto: CreateTaxSlabDto): Promise<TaxSlab> {
    this.validateSalaryRange(dto.minSalary, dto.maxSalary ?? null);
    const slab = this.taxSlabsRepository.create({
      ...dto,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.taxSlabsRepository.save(slab);
    return this.findOneTaxSlab(saved.id);
  }

  async findAllTaxSlabs(): Promise<TaxSlab[]> {
    return this.taxSlabsRepository.find({
      relations: { subTaxes: true },
      order: { minSalary: 'ASC' },
    });
  }

  async findOneTaxSlab(id: number): Promise<TaxSlab> {
    const slab = await this.taxSlabsRepository.findOne({
      where: { id },
      relations: { subTaxes: true },
    });
    if (!slab) {
      throw new NotFoundException(`Tax slab with ID ${id} not found`);
    }
    return slab;
  }

  async updateTaxSlab(id: number, dto: UpdateTaxSlabDto): Promise<TaxSlab> {
    const slab = await this.findOneTaxSlab(id);
    const minSalary = dto.minSalary ?? Number(slab.minSalary);
    const maxSalary =
      dto.maxSalary !== undefined ? dto.maxSalary : slab.maxSalary;
    this.validateSalaryRange(minSalary, maxSalary ?? null);
    Object.assign(slab, dto);
    await this.taxSlabsRepository.save(slab);
    return this.findOneTaxSlab(id);
  }

  async removeTaxSlab(id: number): Promise<void> {
    const slab = await this.findOneTaxSlab(id);
    await this.taxSlabsRepository.remove(slab);
  }

  // --- Sub-Tax CRUD (per slab) ---

  async createSubTax(slabId: number, dto: CreateSubTaxDto): Promise<SubTax> {
    await this.findOneTaxSlab(slabId);
    this.validateSubTaxPayload(dto);

    const existing = await this.subTaxesRepository.findOne({
      where: { taxSlabId: slabId, code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(
        `Sub-tax code '${dto.code}' already exists in this slab`,
      );
    }

    const subTax = this.subTaxesRepository.create({
      ...dto,
      taxSlabId: slabId,
      code: dto.code.toUpperCase(),
      isActive: dto.isActive ?? true,
    });
    return this.subTaxesRepository.save(subTax);
  }

  async findSubTaxesBySlab(slabId: number): Promise<SubTax[]> {
    await this.findOneTaxSlab(slabId);
    return this.subTaxesRepository.find({
      where: { taxSlabId: slabId },
      order: { name: 'ASC' },
    });
  }

  async findAllSubTaxes(): Promise<SubTax[]> {
    return this.subTaxesRepository.find({
      relations: { taxSlab: true },
      order: { taxSlabId: 'ASC', name: 'ASC' },
    });
  }

  async findOneSubTax(slabId: number, id: number): Promise<SubTax> {
    const subTax = await this.subTaxesRepository.findOne({
      where: { id, taxSlabId: slabId },
    });
    if (!subTax) {
      throw new NotFoundException(
        `Sub-tax with ID ${id} not found in slab ${slabId}`,
      );
    }
    return subTax;
  }

  async updateSubTax(
    slabId: number,
    id: number,
    dto: UpdateSubTaxDto,
  ): Promise<SubTax> {
    const subTax = await this.findOneSubTax(slabId, id);

    if (dto.code && dto.code.toUpperCase() !== subTax.code) {
      const existing = await this.subTaxesRepository.findOne({
        where: { taxSlabId: slabId, code: dto.code.toUpperCase() },
      });
      if (existing) {
        throw new ConflictException(
          `Sub-tax code '${dto.code}' already exists in this slab`,
        );
      }
    }

    const merged = { ...subTax, ...dto, type: dto.type ?? subTax.type };
    this.validateSubTaxPayload(merged as CreateSubTaxDto);

    Object.assign(subTax, dto);
    if (dto.code) {
      subTax.code = dto.code.toUpperCase();
    }
    return this.subTaxesRepository.save(subTax);
  }

  async removeSubTax(slabId: number, id: number): Promise<void> {
    const subTax = await this.findOneSubTax(slabId, id);
    await this.subTaxesRepository.remove(subTax);
  }

  // --- Tax Calculation ---

  async findApplicableTaxSlab(salary: number): Promise<TaxSlab | null> {
    const slabs = await this.taxSlabsRepository.find({
      where: { isActive: true },
      relations: { subTaxes: true },
      order: { minSalary: 'ASC' },
    });

    return (
      slabs.find((slab) => {
        const min = Number(slab.minSalary);
        const max = slab.maxSalary !== null ? Number(slab.maxSalary) : null;
        return salary >= min && (max === null || salary <= max);
      }) ?? null
    );
  }

  async calculateTaxes(grossSalary: number): Promise<TaxCalculationResult> {
    const taxSlab = await this.findApplicableTaxSlab(grossSalary);
    const incomeTax = taxSlab
      ? this.round((grossSalary * Number(taxSlab.taxRate)) / 100)
      : 0;

    const activeSubTaxes =
      taxSlab?.subTaxes?.filter((st) => st.isActive) ?? [];

    const subTaxDeductions = activeSubTaxes.map((subTax) => ({
      subTax,
      amount: this.calculateSubTaxAmount(subTax, grossSalary),
    }));

    const subTaxTotal = subTaxDeductions.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const totalDeductions = this.round(incomeTax + subTaxTotal);
    const netSalary = this.round(grossSalary - totalDeductions);

    return {
      taxSlab,
      incomeTax,
      subTaxDeductions,
      totalDeductions,
      netSalary,
    };
  }

  async migrateOrphanSubTaxes(): Promise<void> {
    const orphans = await this.subTaxesRepository
      .createQueryBuilder('st')
      .where('st.tax_slab_id IS NULL')
      .getMany();

    if (orphans.length === 0) {
      return;
    }

    const slabs = await this.taxSlabsRepository.find({ order: { minSalary: 'ASC' } });
    if (slabs.length === 0) {
      return;
    }

    const defaultSlab = slabs.find((s) => s.name === 'Slab B') ?? slabs[0];

    for (const orphan of orphans) {
      orphan.taxSlabId = defaultSlab.id;
      await this.subTaxesRepository.save(orphan);

      for (const slab of slabs) {
        if (slab.id === defaultSlab.id) continue;
        await this.subTaxesRepository.save({
          taxSlabId: slab.id,
          name: orphan.name,
          code: orphan.code,
          type: orphan.type,
          rate: orphan.rate,
          amount: orphan.amount,
          description: orphan.description,
          isActive: orphan.isActive,
        });
      }
    }
  }

  private calculateSubTaxAmount(subTax: SubTax, grossSalary: number): number {
    if (subTax.type === SubTaxType.PERCENTAGE) {
      return this.round((grossSalary * Number(subTax.rate)) / 100);
    }
    return this.round(Number(subTax.amount));
  }

  private validateSalaryRange(
    minSalary: number,
    maxSalary: number | null,
  ): void {
    if (maxSalary !== null && maxSalary !== undefined && maxSalary <= minSalary) {
      throw new BadRequestException(
        'Maximum salary must be greater than minimum salary',
      );
    }
  }

  private validateSubTaxPayload(dto: CreateSubTaxDto): void {
    if (dto.type === SubTaxType.PERCENTAGE && dto.rate === undefined) {
      throw new BadRequestException(
        'Rate is required for percentage-based sub-taxes',
      );
    }
    if (dto.type === SubTaxType.FIXED && dto.amount === undefined) {
      throw new BadRequestException(
        'Amount is required for fixed sub-taxes',
      );
    }
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
