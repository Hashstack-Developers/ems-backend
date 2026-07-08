import { SubTaxType } from '../../tax-slabs/entities/sub-tax.entity';

export interface DemoTaxSlabFixture {
  name: string;
  minSalary: number;
  maxSalary: number | null;
  taxRate: number | null;
  fixedTaxAmount?: number | null;
  description?: string;
  subTaxes?: Array<{
    name: string;
    code: string;
    type: SubTaxType;
    rate?: number;
    amount?: number;
  }>;
}

export const DEMO_TAX_SLAB_FIXTURES: DemoTaxSlabFixture[] = [
  {
    name: 'Demo Exempt',
    minSalary: 0,
    maxSalary: 600_000,
    taxRate: 0,
    description: 'Demo seed — annual income up to Rs. 600,000',
  },
  {
    name: 'Demo Slab A',
    minSalary: 600_001,
    maxSalary: 1_200_000,
    taxRate: 2.5,
    description: 'Demo seed — 2.5% on excess above Rs. 600,000',
    subTaxes: [
      {
        name: 'Demo EOBI',
        code: 'DEMO_EOBI',
        type: SubTaxType.PERCENTAGE,
        rate: 1,
      },
    ],
  },
  {
    name: 'Demo Slab B',
    minSalary: 1_200_001,
    maxSalary: 2_400_000,
    taxRate: 12.5,
    description: 'Demo seed — 12.5% on excess above Rs. 1,200,000',
    subTaxes: [
      {
        name: 'Demo Social Security',
        code: 'DEMO_SS',
        type: SubTaxType.FIXED,
        amount: 500,
      },
    ],
  },
  {
    name: 'Demo Slab C',
    minSalary: 2_400_001,
    maxSalary: null,
    taxRate: 25,
    description: 'Demo seed — 25% on excess above Rs. 2,400,000',
  },
];
