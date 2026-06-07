import type { Response } from 'express';
import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    download(type: string, format: string, month?: string, year?: string, res?: Response): Promise<void>;
}
