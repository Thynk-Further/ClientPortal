const RFQ_STATUS_LABELS: Record<number, string> = {
  1: 'Draft',
  2: 'Pending',
  3: 'Quoted',
  4: 'Accepted',
  5: 'Rejected',
  6: 'Cancelled',
};

export function rfqStatusLabel(status: number): string {
  return RFQ_STATUS_LABELS[status] ?? 'Unknown';
}

export function rfqStatusAccentClass(status: number): string {
  switch (status) {
    case 2:
      return 'bg-blue-500';
    case 3:
      return 'bg-amber-500';
    case 4:
      return 'bg-emerald-500';
    case 5:
      return 'bg-red-500';
    case 6:
      return 'bg-zinc-400';
    default:
      return 'bg-zinc-400';
  }
}

export function rfqActivityVerb(status: number): string {
  switch (status) {
    case 1:
      return 'Created';
    case 2:
      return 'Received';
    default:
      return 'Updated';
  }
}

export function formatRfqLongDate(value: string): string {
  const parsed = parseRfqDate(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.trim() === '' ? '—' : value;
  }

  return parsed.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatRfqDateTime(value: string): string {
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

export function formatRfqDueDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRfqDueTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export type RfqDueUrgency = 'overdue' | 'soon' | 'normal';

export function rfqDueUrgency(value: string): RfqDueUrgency {
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) {
    return 'normal';
  }

  const diffMs = due.getTime() - Date.now();
  if (diffMs < 0) {
    return 'overdue';
  }

  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 3 ? 'soon' : 'normal';
}

export function rfqDueUrgencyLabel(value: string): string | null {
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) {
    return null;
  }

  const diffMs = due.getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'Overdue';
  }

  if (diffDays === 0) {
    return 'Due today';
  }

  if (diffDays === 1) {
    return 'Due tomorrow';
  }

  if (diffDays <= 7) {
    return `Due in ${diffDays} days`;
  }

  return null;
}

function parseRfqDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (match === null) {
    return new Date(value);
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  return new Date(year, month - 1, day);
}
