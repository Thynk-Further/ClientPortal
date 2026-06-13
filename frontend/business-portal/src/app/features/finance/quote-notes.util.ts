export interface ParsedQuoteNotes {
  paymentTerms: string;
  deliveryTerms: string;
  validityDays: number;
  signatoryName: string;
  signatoryTitle: string;
}

const DEFAULT_PAYMENT_TERMS = 'COD';
const DEFAULT_DELIVERY_TERMS =
  'Ex-stock, subject to priority sale otherwise 5-7 working days.';
const DEFAULT_VALIDITY_DAYS = 60;
const DEFAULT_SIGNATORY_TITLE = 'Sales representative';

export function parseQuoteNotes(notes: string | null | undefined): ParsedQuoteNotes {
  if (!notes?.trim()) {
    return {
      paymentTerms: DEFAULT_PAYMENT_TERMS,
      deliveryTerms: DEFAULT_DELIVERY_TERMS,
      validityDays: DEFAULT_VALIDITY_DAYS,
      signatoryName: '',
      signatoryTitle: DEFAULT_SIGNATORY_TITLE,
    };
  }

  const paymentTerms =
    notes.match(/^PAYMENT TERMS:\s*(.+)$/m)?.[1]?.trim() ?? DEFAULT_PAYMENT_TERMS;
  const deliveryTerms =
    notes.match(/^DELIVERY:\s*(.+)$/m)?.[1]?.trim() ?? DEFAULT_DELIVERY_TERMS;
  const validityMatch = notes.match(/^VALIDITY:\s*(\d+)/m);
  const validityDays = validityMatch ? Number.parseInt(validityMatch[1], 10) : DEFAULT_VALIDITY_DAYS;
  const preparedBy = notes.match(/^Prepared by:\s*(.+)$/m)?.[1]?.trim() ?? '';
  const signatoryMatch = preparedBy.match(/^(.+?)\s*\((.+)\)$/);
  const signatoryName = signatoryMatch?.[1]?.trim() ?? preparedBy;
  const signatoryTitle = signatoryMatch?.[2]?.trim() ?? DEFAULT_SIGNATORY_TITLE;

  return {
    paymentTerms,
    deliveryTerms,
    validityDays: Number.isFinite(validityDays) && validityDays > 0 ? validityDays : DEFAULT_VALIDITY_DAYS,
    signatoryName,
    signatoryTitle,
  };
}

export function buildQuoteNotes(input: {
  paymentTerms: string;
  deliveryTerms: string;
  validityDays: number;
  signatoryName: string;
  signatoryTitle: string;
}): string {
  return [
    `PAYMENT TERMS: ${input.paymentTerms.trim()}`,
    `DELIVERY: ${input.deliveryTerms.trim()}`,
    `VALIDITY: ${input.validityDays} days from date of quotation.`,
    input.signatoryName.trim()
      ? `Prepared by: ${input.signatoryName.trim()}${input.signatoryTitle.trim() ? ` (${input.signatoryTitle.trim()})` : ''}`
      : null,
  ]
    .filter((line): line is string => line !== null && line.trim() !== '')
    .join('\n');
}
