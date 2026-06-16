const INVOICE_STATUS_LABELS: Record<number, string> = {
  1: 'Draft',
  2: 'Sent',
  3: 'Viewed',
  4: 'Partially paid',
  5: 'Paid',
  6: 'Overdue',
  7: 'Cancelled',
};

export function clientInvoiceStatusLabel(status: number): string {
  return INVOICE_STATUS_LABELS[status] ?? 'Unknown';
}

export function clientInvoiceStatusAccentClass(status: number): string {
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
