import { CreateGpFundRecordDto } from './dto/create-gp-fund-record.dto';
import { UpdateGpFundRecordDto } from './dto/update-gp-fund-record.dto';
import { GpFundService } from './gp-fund.service';
export declare class GpFundController {
    private readonly gpFundService;
    constructor(gpFundService: GpFundService);
    findAll(): Promise<{
        success: boolean;
        data: import("./entities/gp-fund-record.entity").GpFundRecord[];
    }>;
    getSuggestedCollection(year: number): Promise<{
        success: boolean;
        data: {
            year: number;
            suggestedAmount: number;
            payrollCount: number;
            source: string;
        };
    }>;
    findOne(id: number): Promise<{
        success: boolean;
        data: import("./entities/gp-fund-record.entity").GpFundRecord;
    }>;
    create(dto: CreateGpFundRecordDto): Promise<{
        success: boolean;
        data: import("./entities/gp-fund-record.entity").GpFundRecord[];
    }>;
    update(id: number, dto: UpdateGpFundRecordDto): Promise<{
        success: boolean;
        data: import("./entities/gp-fund-record.entity").GpFundRecord[];
    }>;
    remove(id: number): Promise<{
        success: boolean;
        data: import("./entities/gp-fund-record.entity").GpFundRecord[];
    }>;
}
