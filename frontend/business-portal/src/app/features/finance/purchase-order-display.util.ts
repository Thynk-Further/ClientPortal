const PO_STATUS_LABELS: Record<number, string> = {
  1: 'Pending approval',
  2: 'Approved',
  3: 'Invoiced',
  4: 'Rejected',
  5: 'Cancelled',
};

export function purchaseOrderStatusLabel(status: number): string {
  return PO_STATUS_LABELS[status] ?? 'Unknown';
}

export function purchaseOrderStatusAccentClass(status: number): string {
  switch (status) {
    case 1:
      return 'bg-blue-500';
    case 2:
      return 'bg-emerald-500';
    case 3:
      return 'bg-violet-500';
    case 4:
      return 'bg-red-500';
    case 5:
      return 'bg-zinc-400';
    default:
      return 'bg-zinc-400';
  }
}

export function formatPurchaseOrderDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.trim() === '' ? '—' : value;
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
