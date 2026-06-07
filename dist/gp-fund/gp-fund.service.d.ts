import { Repository } from 'typeorm';
import { Payroll } from '../payrolls/entities/payroll.entity';
import { CreateGpFundRecordDto } from './dto/create-gp-fund-record.dto';
import { UpdateGpFundRecordDto } from './dto/update-gp-fund-record.dto';
import { GpFundRecord } from './entities/gp-fund-record.entity';
export declare class GpFundService {
    private readonly gpFundRepository;
    private readonly payrollsRepository;
    constructor(gpFundRepository: Repository<GpFundRecord>, payrollsRepository: Repository<Payroll>);
    findAll(): Promise<GpFundRecord[]>;
    findOne(id: number): Promise<GpFundRecord>;
    findByYear(year: number): Promise<GpFundRecord | null>;
    create(dto: CreateGpFundRecordDto): Promise<GpFundRecord[]>;
    update(id: number, dto: UpdateGpFundRecordDto): Promise<GpFundRecord[]>;
    remove(id: number): Promise<GpFundRecord[]>;
    getSuggestedTaxCollection(year: number): Promise<{
        year: number;
        suggestedAmount: number;
        payrollCount: number;
        source: string;
    }>;
    recalculateAllBalances(): Promise<GpFundRecord[]>;
    private round;
}
