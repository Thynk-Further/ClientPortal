const INVOICE_STATUS_LABELS: Record<number, string> = {
  1: 'Draft',
  2: 'Sent',
  3: 'Viewed',
  4: 'Partially paid',
  5: 'Paid',
  6: 'Overdue',
  7: 'Cancelled',
};

export const INVOICE_STATUS_DRAFT = 1;

export function invoiceStatusLabel(status: number): string {
  return INVOICE_STATUS_LABELS[status] ?? 'Unknown';
}

export function invoiceStatusClass(status: number): string {
  const base = 'inline-flex rounded-md px-2.5 py-1 text-xs font-medium';
  switch (status) {
    case 1:
      return `${base} bg-neutral-100 text-neutral-600`;
    case 2:
      return `${base} bg-blue-100 text-blue-700`;
    case 3:
      return `${base} bg-sky-100 text-sky-700`;
    case 4:
      return `${base} bg-amber-100 text-amber-800`;
    case 5:
      return `${base} bg-emerald-100 text-emerald-700`;
    case 6:
      return `${base} bg-rose-100 text-rose-700`;
    case 7:
      return `${base} bg-zinc-100 text-zinc-600`;
    default:
      return `${base} bg-neutral-100 text-neutral-600`;
  }
}

export function invoiceStatusAccentClass(status: number): string {
  switch (status) {
    case 1:
      return 'bg-zinc-400';
    case 2:
      return 'bg-blue-500';
    case 3:
      return 'bg-sky-500';
    case 4:
      return 'bg-amber-500';
    case 5:
      return 'bg-emerald-500';
    case 6:
      return 'bg-red-500';
    case 7:
      return 'bg-zinc-400';
    default:
      return 'bg-zinc-400';
  }
}

export function formatInvoiceDate(value: string): string {
  const parsed = parseIsoDate(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.trim() === '' ? '—' : value;
  }

  return parsed.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function parseIsoDate(value: string): Date {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00`);
  }

  return new Date(trimmed);
}
