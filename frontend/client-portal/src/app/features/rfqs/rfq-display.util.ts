const RFQ_STATUS_LABELS: Record<number, string> = {
  1: 'Draft',
  2: 'Submitted',
  3: 'Quoted',
  4: 'Accepted',
  5: 'Rejected',
  6: 'Cancelled',
};

export function clientRfqStatusLabel(status: number): string {
  return RFQ_STATUS_LABELS[status] ?? 'Unknown';
}

export function formatClientRfqDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.trim() === '' ? '—' : value;
  }

  return parsed.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function defaultQuotationDueLocalValue(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(17, 0, 0, 0);
  return toDatetimeLocalValue(date);
}

export function toDatetimeLocalValue(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function datetimeLocalToIsoUtc(localValue: string): string {
  return new Date(localValue).toISOString();
}
