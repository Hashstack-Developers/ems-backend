import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payroll } from '../payrolls/entities/payroll.entity';
import { PensionEnrollment } from './entities/pension-enrollment.entity';
import { roundAmount } from '../common/utils/currency.utils';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

@Injectable()
export class PensionOverviewService {
  constructor(
    @InjectRepository(Payroll)
    private readonly payrollRepo: Repository<Payroll>,
    @InjectRepository(PensionEnrollment)
    private readonly enrollmentRepo: Repository<PensionEnrollment>,
  ) {}

  async getOverview(query: { years?: number[]; months?: number[] } = {}) {
    const payrolls = await this.buildQuery(query).getMany();
    const availableYears = await this.getAvailableYears();
    const enrollments = await this.enrollmentRepo.find({ relations: { employee: true } });

    let totalPension = 0;
    let payrollCount = 0;
    const employeeIds = new Set<number>();
    const monthMap = new Map<string, { year: number; month: number; label: string; total: number; count: number; empIds: Set<number> }>();
    const yearMap = new Map<number, { year: number; total: number; count: number; empIds: Set<number> }>();
    const empMap = new Map<number, { employeeId: number; employeeCode: string; name: string; designation: string; total: number; count: number }>();

    for (const p of payrolls) {
      const amt = roundAmount(p.pensionAmount ?? 0);
      if (amt <= 0) continue;

      payrollCount++;
      employeeIds.add(p.employeeId);
      totalPension = roundAmount(totalPension + amt);

      const mk = `${p.year}-${p.month}`;
      const mEntry = monthMap.get(mk) ?? { year: p.year, month: p.month, label: `${MONTH_NAMES[p.month - 1]} ${p.year}`, total: 0, count: 0, empIds: new Set() };
      mEntry.total = roundAmount(mEntry.total + amt);
      mEntry.count++;
      mEntry.empIds.add(p.employeeId);
      monthMap.set(mk, mEntry);

      const yEntry = yearMap.get(p.year) ?? { year: p.year, total: 0, count: 0, empIds: new Set() };
      yEntry.total = roundAmount(yEntry.total + amt);
      yEntry.count++;
      yEntry.empIds.add(p.employeeId);
      yearMap.set(p.year, yEntry);

      if (p.employee) {
        const eEntry = empMap.get(p.employeeId) ?? { employeeId: p.employeeId, employeeCode: p.employee.employeeCode, name: p.employee.name, designation: p.employee.designation, total: 0, count: 0 };
        eEntry.total = roundAmount(eEntry.total + amt);
        eEntry.count++;
        empMap.set(p.employeeId, eEntry);
      }
    }

    const byMonth = [...monthMap.values()].map((e) => ({ ...e, employeeCount: e.empIds.size, empIds: undefined })).sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year);
    const byYear = [...yearMap.values()].map((e) => ({ ...e, employeeCount: e.empIds.size, empIds: undefined })).sort((a, b) => a.year - b.year);
    const byEmployee = [...empMap.values()].sort((a, b) => b.total - a.total);
    const records = payrolls.filter((p) => roundAmount(p.pensionAmount ?? 0) > 0).map((p) => ({
      payrollId: p.id, employeeId: p.employeeId, employeeCode: p.employee?.employeeCode ?? '', name: p.employee?.name ?? '',
      designation: p.employee?.designation ?? '', month: p.month, year: p.year,
      label: `${MONTH_NAMES[p.month - 1]} ${p.year}`, pensionAmount: roundAmount(p.pensionAmount ?? 0), grossSalary: roundAmount(p.grossSalary),
    }));

    return {
      summary: { payrollCount, employeeCount: employeeIds.size, totalPension, activeEnrollments: enrollments.filter((e) => e.isActive).length, totalEnrollments: enrollments.length },
      byMonth, byYear, byEmployee, records, availableYears,
    };
  }

  async getDashboardSummary() {
    const ov = await this.getOverview({});
    return {
      totalPension: ov.summary.totalPension,
      activeEnrollments: ov.summary.activeEnrollments,
      enrolledEmployees: ov.summary.employeeCount,
      byMonth: ov.byMonth.slice(-6),
    };
  }

  private buildQuery(query: { years?: number[]; months?: number[] }) {
    const qb = this.payrollRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.employee', 'e')
      .where('p.pension_amount > 0');
    if (query.years?.length) qb.andWhere('p.year IN (:...years)', { years: query.years });
    if (query.months?.length) qb.andWhere('p.month IN (:...months)', { months: query.months });
    return qb.orderBy('p.year', 'DESC').addOrderBy('p.month', 'DESC').addOrderBy('e.name', 'ASC');
  }

  private async getAvailableYears(): Promise<number[]> {
    const rows = await this.payrollRepo.createQueryBuilder('p').select('DISTINCT p.year', 'year').where('p.pension_amount > 0').orderBy('p.year', 'DESC').getRawMany<{ year: string }>();
    return rows.map((r) => parseInt(r.year, 10)).filter((y) => !Number.isNaN(y));
  }
}
