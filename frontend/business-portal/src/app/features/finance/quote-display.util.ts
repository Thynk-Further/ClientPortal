const QUOTE_STATUS_LABELS: Record<number, string> = {
  1: 'Draft',
  2: 'Sent',
  3: 'Accepted',
  4: 'Rejected',
  5: 'Expired',
};

export function quoteStatusLabel(status: number): string {
  return QUOTE_STATUS_LABELS[status] ?? 'Unknown';
}

export function quoteStatusClass(status: number): string {
  const base = 'inline-flex rounded-md px-2.5 py-1 text-xs font-medium';
  switch (status) {
    case 1:
      return `${base} bg-neutral-100 text-neutral-600`;
    case 2:
      return `${base} bg-blue-100 text-blue-700`;
    case 3:
      return `${base} bg-emerald-100 text-emerald-700`;
    case 4:
      return `${base} bg-rose-100 text-rose-700`;
    case 5:
      return `${base} bg-amber-100 text-amber-800`;
    default:
      return `${base} bg-neutral-100 text-neutral-600`;
  }
}

export function quoteStatusAccentClass(status: number): string {
  switch (status) {
    case 1:
      return 'bg-zinc-400';
    case 2:
      return 'bg-blue-500';
    case 3:
      return 'bg-emerald-500';
    case 4:
      return 'bg-red-500';
    case 5:
      return 'bg-amber-500';
    default:
      return 'bg-zinc-400';
  }
}

export function formatQuoteDate(value: string): string {
  const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatQuoteMoney(total: number, currency: string): string {
  const code = (currency || 'USD').trim().toUpperCase();
  const amount = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(total) ? total : 0);

  return `${code} ${amount}`;
}
