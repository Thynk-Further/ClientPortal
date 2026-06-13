import { rfqStatusLabel } from './rfq-display.util';
import { purchaseOrderStatusLabel } from './purchase-order-display.util';
import { quoteStatusLabel } from './quote-display.util';
import { invoiceStatusLabel } from './invoice-display.util';

const STATUS_BAR_COLORS = [
  'bg-slate-500',
  'bg-blue-500',
  'bg-sky-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
];

export interface FinanceBreakdownBar {
  readonly label: string;
  readonly count: number;
  readonly totalValue: number | null;
  readonly percent: number;
  readonly barClass: string;
}

export function financeStatusBarColor(index: number): string {
  return STATUS_BAR_COLORS[index % STATUS_BAR_COLORS.length];
}

export function rfqBreakdownBars(
  items: Array<{ status: number; count: number; totalValue: number }>,
): FinanceBreakdownBar[] {
  return buildBreakdownBars(items, rfqStatusLabel, false);
}

export function quoteBreakdownBars(
  items: Array<{ status: number; count: number; totalValue: number }>,
): FinanceBreakdownBar[] {
  return buildBreakdownBars(items, quoteStatusLabel, true);
}

export function purchaseOrderBreakdownBars(
  items: Array<{ status: number; count: number; totalValue: number }>,
): FinanceBreakdownBar[] {
  return buildBreakdownBars(items, purchaseOrderStatusLabel, true);
}

export function invoiceBreakdownBars(
  items: Array<{ status: number; count: number; totalValue: number }>,
): FinanceBreakdownBar[] {
  return buildBreakdownBars(items, invoiceStatusLabel, true);
}

export function formatFinanceAmount(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCashflowPeriod(period: string): string {
  const parsed = new Date(period.includes('T') ? period : `${period}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return period;
  }

  return parsed.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function buildBreakdownBars(
  items: Array<{ status: number; count: number; totalValue: number }>,
  labelFn: (status: number) => string,
  showValue: boolean,
): FinanceBreakdownBar[] {
  const totalCount = items.reduce((sum, item) => sum + item.count, 0);

  return items.map((item, index) => ({
    label: labelFn(item.status),
    count: item.count,
    totalValue: showValue ? item.totalValue : null,
    percent: totalCount === 0 ? 0 : Math.round((item.count / totalCount) * 100),
    barClass: financeStatusBarColor(index),
  }));
}

export function agingBreakdownBars(aging: {
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  days91Plus: number;
}): Array<{ label: string; amount: number; percent: number; barClass: string }> {
  const buckets = [
    { label: 'Current', amount: aging.current, barClass: 'bg-emerald-500' },
    { label: '1–30 days overdue', amount: aging.days1To30, barClass: 'bg-amber-500' },
    { label: '31–60 days overdue', amount: aging.days31To60, barClass: 'bg-orange-500' },
    { label: '61–90 days overdue', amount: aging.days61To90, barClass: 'bg-rose-500' },
    { label: '91+ days overdue', amount: aging.days91Plus, barClass: 'bg-red-700' },
  ];

  const total = buckets.reduce((sum, bucket) => sum + bucket.amount, 0);

  return buckets.map((bucket) => ({
    ...bucket,
    percent: total === 0 ? 0 : Math.round((bucket.amount / total) * 100),
  }));
}

export function cashflowBars(cashflow: Array<{ period: string; inflow: number }>): Array<{
  label: string;
  inflow: number;
  percent: number;
}> {
  const maxInflow = Math.max(...cashflow.map((point) => point.inflow), 1);

  return cashflow.map((point) => ({
    label: formatCashflowPeriod(point.period),
    inflow: point.inflow,
    percent: Math.round((point.inflow / maxInflow) * 100),
  }));
}
