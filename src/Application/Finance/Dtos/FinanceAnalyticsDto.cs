using Application.Invoices.Dtos;

namespace Application.Finance.Dtos;

public sealed record FinanceAnalyticsDto(
    FinancePipelineSummaryDto Pipeline,
    FinanceInvoiceMetricsDto Invoices,
    InvoiceAgingSummaryDto Aging,
    IReadOnlyCollection<FinanceStatusBreakdownDto> RfqStatusBreakdown,
    IReadOnlyCollection<FinanceStatusBreakdownDto> QuoteStatusBreakdown,
    IReadOnlyCollection<FinanceStatusBreakdownDto> PurchaseOrderStatusBreakdown,
    IReadOnlyCollection<FinanceStatusBreakdownDto> InvoiceStatusBreakdown,
    IReadOnlyCollection<CashflowPointDto> Cashflow,
    int PendingPaymentSubmissions);

public sealed record FinancePipelineSummaryDto(
    int TotalRfqs,
    int TotalQuotes,
    int TotalPurchaseOrders,
    int TotalInvoices,
    decimal OpenQuotesValue,
    decimal OpenPurchaseOrdersValue,
    decimal InvoicedValue,
    decimal CollectedValue,
    decimal OutstandingValue);

public sealed record FinanceInvoiceMetricsDto(
    decimal TotalOutstanding,
    decimal PaidThisMonth,
    int OverdueCount,
    decimal TotalInvoiced,
    decimal TotalCollected);

public sealed record FinanceStatusBreakdownDto(
    int Status,
    int Count,
    decimal TotalValue);
