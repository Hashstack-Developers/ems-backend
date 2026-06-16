# EMS Backend (NestJS)

REST API for the Employee Management System.

## Modules

| Module       | Path prefix    | Responsibility                          |
|--------------|----------------|-----------------------------------------|
| AuthModule   | `/auth`        | JWT login, profile                      |
| EmployeesModule | `/employees` | Employee CRUD                        |
| TaxSlabsModule  | `/tax-slabs` | Tax slab & sub-tax CRUD, tax engine  |
| PayrollsModule  | `/payrolls`  | Payroll generation & listing         |
| ReportsModule   | `/reports`   | PDF/CSV export                       |
| DashboardModule | `/dashboard` | Aggregate statistics                 |
| UsersModule     | —            | User entity, admin seeding           |

## Running

```bash
cp .env.example .env
npm install
npm run dev
```

Requires local MySQL (MySQL Workbench). Run `backend/scripts/setup-database.sql` first, then set credentials in `.env`.

## Validation

All DTOs use `class-validator`. The global `ValidationPipe` strips unknown fields (`whitelist: true`) and rejects extra properties (`forbidNonWhitelisted: true`).

## Seeding

On module init:
- `RbacSeedService` creates roles and permissions
- `UsersSeedService` creates admin users from `.env` if passwords are configured
