const MEETING_STATUS_LABELS: Record<number, string> = {
  1: 'Scheduled',
  2: 'Completed',
  3: 'Cancelled',
  4: 'Pending acceptance',
  5: 'Declined',
};

export function meetingStatusLabel(status: number): string {
  return MEETING_STATUS_LABELS[status] ?? 'Unknown';
}

export function meetingStatusAccentClass(status: number): string {
  switch (status) {
    case 1:
      return 'bg-emerald-500';
    case 2:
      return 'bg-blue-500';
    case 3:
      return 'bg-zinc-400';
    case 4:
      return 'bg-amber-500';
    case 5:
      return 'bg-red-500';
    default:
      return 'bg-zinc-400';
  }
}

export function formatMeetingDate(value: string): string {
  const parsed = new Date(value);
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

export function formatMeetingTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatMeetingDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainder} min`;
}
