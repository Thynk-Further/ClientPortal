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
