# EMS Backend (NestJS)

REST API for the Employee Management System.

## Modules

| Module          | Path prefix     | Responsibility |
|-----------------|-----------------|----------------|
| AuthModule      | `/auth`         | JWT login, profile |
| EmployeesModule | `/employees`    | Employee CRUD |
| TaxSlabsModule  | `/tax-slabs`    | Tax slabs, sub-taxes, tax calculation, **tax overview** |
| GpFundModule    | `/gp-fund`      | GP scales, **GP fund overview**, annual records |
| PayrollsModule  | `/payrolls`     | Payroll generation (taxes + GP fund), salary slips |
| DashboardModule | `/dashboard`    | Combined dashboard stats |
| ReportsModule   | `/reports`      | PDF/CSV export |
| RbacModule      | —               | Roles & permissions seed |
| UsersModule     | —               | Admin user seeding |

Payroll flow: `computePayrollGross()` → `TaxSlabsService.calculateTaxes()` → GP fund from scale → snapshot deductions.

Tax overview and GP fund overview use **separate** aggregation; taxes exclude `GP_FUND` deductions.

See root [README.md](../README.md) and [docs/PLAYBOOK.md](../docs/PLAYBOOK.md).

## Running

```bash
cp .env.example .env
npm install
npm run dev
```

Requires local MySQL. Run `scripts/setup-database.sql`, then configure `.env`.

## Validation

DTOs use `class-validator`. Global `ValidationPipe`: `whitelist: true`, `forbidNonWhitelisted: true`.

## Seeding

On module init:

- `RbacSeedService` — roles and permissions
- `UsersSeedService` — admin users from `.env` when passwords are set
- GP fund default scales `B-1` … `B-22` created on first access to scales API if missing
