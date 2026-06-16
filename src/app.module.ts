import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GpFundModule } from './gp-fund/gp-fund.module';
import { GpFundRecord } from './gp-fund/entities/gp-fund-record.entity';
import { Employee } from './employees/entities/employee.entity';
import { EmployeesModule } from './employees/employees.module';
import { PayrollDeduction } from './payrolls/entities/payroll-deduction.entity';
import { Payroll } from './payrolls/entities/payroll.entity';
import { PayrollsModule } from './payrolls/payrolls.module';
import { ReportsModule } from './reports/reports.module';
import { SubTax } from './tax-slabs/entities/sub-tax.entity';
import { TaxSlab } from './tax-slabs/entities/tax-slab.entity';
import { TaxSlabsModule } from './tax-slabs/tax-slabs.module';
import { Permission } from './rbac/entities/permission.entity';
import { Role } from './rbac/entities/role.entity';
import { RbacModule } from './rbac/rbac.module';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const sslMode = configService.get<string>('SSL_MODE');
        return {
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'ems_user'),
        password: configService.get<string>('DB_PASSWORD', 'ems_password'),
        database: configService.get<string>('DB_DATABASE', 'employee_management'),
        entities: [
          User,
          Role,
          Permission,
          Employee,
          TaxSlab,
          SubTax,
          Payroll,
          PayrollDeduction,
          GpFundRecord,
        ],
        synchronize: true,
        logging: configService.get<string>('NODE_ENV') === 'development',
        ssl: sslMode === 'REQUIRED' ? { rejectUnauthorized: false } : undefined,
      };
      },
    }),
    RbacModule,
    UsersModule,
    AuthModule,
    EmployeesModule,
    TaxSlabsModule,
    PayrollsModule,
    GpFundModule,
    DashboardModule,
    ReportsModule,
  ],
})
export class AppModule {}
