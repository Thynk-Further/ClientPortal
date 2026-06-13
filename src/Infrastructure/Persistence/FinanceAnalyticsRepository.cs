using Application.Finance.Abstractions;
using Application.Finance.Dtos;
using Application.Invoices.Dtos;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public sealed class FinanceAnalyticsRepository : IFinanceAnalyticsRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public FinanceAnalyticsRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public async Task<FinanceAnalyticsDto> GetAnalyticsAsync(
        Guid? clientId,
        DateOnly asOfDate,
        CancellationToken cancellationToken)
    {
        IQueryable<Rfq> rfqQuery = _tenantDbContext.Set<Rfq>().AsNoTracking();
        IQueryable<Quote> quoteQuery = _tenantDbContext.Set<Quote>().AsNoTracking();
        IQueryable<PurchaseOrder> purchaseOrderQuery = _tenantDbContext.Set<PurchaseOrder>().AsNoTracking();
        IQueryable<Invoice> invoiceQuery = _tenantDbContext.Set<Invoice>().AsNoTracking();
        IQueryable<InvoicePaymentSubmission> submissionQuery =
            _tenantDbContext.Set<InvoicePaymentSubmission>().AsNoTracking();

        if (clientId.HasValue)
        {
            Guid scopedClientId = clientId.Value;
            rfqQuery = rfqQuery.Where(entity => entity.ClientId == scopedClientId);
            quoteQuery = quoteQuery.Where(entity => entity.ClientId == scopedClientId);
            purchaseOrderQuery = purchaseOrderQuery.Where(entity => entity.ClientId == scopedClientId);
            invoiceQuery = invoiceQuery.Where(entity => entity.ClientId == scopedClientId);
            submissionQuery = submissionQuery.Where(entity => entity.ClientId == scopedClientId);
        }

        List<Rfq> rfqs = await rfqQuery.ToListAsync(cancellationToken);
        List<Quote> quotes = await quoteQuery.ToListAsync(cancellationToken);
        List<PurchaseOrder> purchaseOrders = await purchaseOrderQuery.ToListAsync(cancellationToken);
        List<Invoice> invoices = await invoiceQuery.ToListAsync(cancellationToken);

        int pendingPaymentSubmissions = await submissionQuery
            .CountAsync(
                submission => submission.Status == InvoicePaymentSubmissionStatus.Submitted,
                cancellationToken);

        IReadOnlyCollection<FinanceStatusBreakdownDto> rfqStatusBreakdown = BuildRfqBreakdown(rfqs);
        IReadOnlyCollection<FinanceStatusBreakdownDto> quoteStatusBreakdown = BuildQuoteBreakdown(quotes);
        IReadOnlyCollection<FinanceStatusBreakdownDto> purchaseOrderStatusBreakdown =
            BuildPurchaseOrderBreakdown(purchaseOrders);
        IReadOnlyCollection<FinanceStatusBreakdownDto> invoiceStatusBreakdown = BuildInvoiceBreakdown(invoices);

        decimal openQuotesValue = quotes
            .Where(quote => quote.Status is QuoteStatus.Draft or QuoteStatus.Sent)
            .Sum(quote => quote.Total);

        decimal openPurchaseOrdersValue = purchaseOrders
            .Where(order => order.Status is PurchaseOrderStatus.PendingApproval or PurchaseOrderStatus.Approved)
            .Sum(order => order.Total);

        decimal invoicedValue = 0m;
        decimal collectedValue = 0m;
        decimal totalOutstanding = 0m;
        int overdueCount = 0;

        InvoiceAgingSummaryDto aging = BuildAgingSummary(invoices, asOfDate, out totalOutstanding, out overdueCount);

        foreach (Invoice invoice in invoices)
        {
            if (invoice.Status == InvoiceStatus.Cancelled)
            {
                continue;
            }

            invoicedValue += invoice.Total;
            collectedValue += invoice.AmountPaid;
        }

        FinanceInvoiceMetricsDto invoiceMetrics = new(
            RoundMoney(totalOutstanding),
            RoundMoney(CalculatePaidThisMonth(invoices, asOfDate)),
            overdueCount,
            RoundMoney(invoicedValue),
            RoundMoney(collectedValue));

        FinancePipelineSummaryDto pipeline = new(
            rfqs.Count,
            quotes.Count,
            purchaseOrders.Count,
            invoices.Count,
            RoundMoney(openQuotesValue),
            RoundMoney(openPurchaseOrdersValue),
            RoundMoney(invoicedValue),
            RoundMoney(collectedValue),
            RoundMoney(totalOutstanding));

        IReadOnlyCollection<CashflowPointDto> cashflow = BuildCashflow(invoices, asOfDate);

        return new FinanceAnalyticsDto(
            pipeline,
            invoiceMetrics,
            aging,
            rfqStatusBreakdown,
            quoteStatusBreakdown,
            purchaseOrderStatusBreakdown,
            invoiceStatusBreakdown,
            cashflow,
            pendingPaymentSubmissions);
    }

    private static IReadOnlyCollection<FinanceStatusBreakdownDto> BuildRfqBreakdown(IEnumerable<Rfq> rfqs) =>
        rfqs.GroupBy(rfq => rfq.Status)
            .Select(group => new FinanceStatusBreakdownDto((int)group.Key, group.Count(), 0m))
            .OrderBy(item => item.Status)
            .ToList()
            .AsReadOnly();

    private static IReadOnlyCollection<FinanceStatusBreakdownDto> BuildQuoteBreakdown(IEnumerable<Quote> quotes) =>
        quotes.GroupBy(quote => quote.Status)
            .Select(group => new FinanceStatusBreakdownDto(
                (int)group.Key,
                group.Count(),
                RoundMoney(group.Sum(quote => quote.Total))))
            .OrderBy(item => item.Status)
            .ToList()
            .AsReadOnly();

    private static IReadOnlyCollection<FinanceStatusBreakdownDto> BuildPurchaseOrderBreakdown(
        IEnumerable<PurchaseOrder> purchaseOrders) =>
        purchaseOrders.GroupBy(order => order.Status)
            .Select(group => new FinanceStatusBreakdownDto(
                (int)group.Key,
                group.Count(),
                RoundMoney(group.Sum(order => order.Total))))
            .OrderBy(item => item.Status)
            .ToList()
            .AsReadOnly();

    private static IReadOnlyCollection<FinanceStatusBreakdownDto> BuildInvoiceBreakdown(IEnumerable<Invoice> invoices) =>
        invoices.GroupBy(invoice => invoice.Status)
            .Select(group => new FinanceStatusBreakdownDto(
                (int)group.Key,
                group.Count(),
                RoundMoney(group.Sum(invoice => invoice.Total))))
            .OrderBy(item => item.Status)
            .ToList()
            .AsReadOnly();

    private static InvoiceAgingSummaryDto BuildAgingSummary(
        IEnumerable<Invoice> invoices,
        DateOnly asOfDate,
        out decimal totalOutstanding,
        out int overdueCount)
    {
        decimal current = 0m;
        decimal days1To30 = 0m;
        decimal days31To60 = 0m;
        decimal days61To90 = 0m;
        decimal days91Plus = 0m;
        totalOutstanding = 0m;
        overdueCount = 0;

        foreach (Invoice invoice in invoices)
        {
            if (invoice.Status == InvoiceStatus.Cancelled)
            {
                continue;
            }

            decimal outstanding = RoundMoney(Math.Max(0m, invoice.Total - invoice.AmountPaid));
            if (outstanding <= 0m)
            {
                continue;
            }

            totalOutstanding += outstanding;
            int overdueDays = asOfDate.DayNumber - invoice.DueDate.DayNumber;
            if (overdueDays <= 0)
            {
                current += outstanding;
                continue;
            }

            overdueCount++;
            if (overdueDays <= 30)
            {
                days1To30 += outstanding;
            }
            else if (overdueDays <= 60)
            {
                days31To60 += outstanding;
            }
            else if (overdueDays <= 90)
            {
                days61To90 += outstanding;
            }
            else
            {
                days91Plus += outstanding;
            }
        }

        totalOutstanding = RoundMoney(totalOutstanding);

        return new InvoiceAgingSummaryDto(
            RoundMoney(current),
            RoundMoney(days1To30),
            RoundMoney(days31To60),
            RoundMoney(days61To90),
            RoundMoney(days91Plus),
            totalOutstanding,
            overdueCount);
    }

    private static decimal CalculatePaidThisMonth(IEnumerable<Invoice> invoices, DateOnly asOfDate)
    {
        DateTime monthStartUtc = new(asOfDate.Year, asOfDate.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        DateTime monthEndUtcExclusive = monthStartUtc.AddMonths(1);

        return invoices
            .Where(invoice => invoice.PaidAt.HasValue)
            .Where(invoice => invoice.PaidAt!.Value >= monthStartUtc && invoice.PaidAt!.Value < monthEndUtcExclusive)
            .Sum(invoice => invoice.AmountPaid);
    }

    private static IReadOnlyCollection<CashflowPointDto> BuildCashflow(IEnumerable<Invoice> invoices, DateOnly asOfDate)
    {
        DateOnly windowStart = asOfDate.AddMonths(-5);
        DateOnly windowEnd = asOfDate;
        List<CashflowPointDto> cashflow = [];
        DateOnly cursor = new(windowStart.Year, windowStart.Month, 1);
        DateOnly endMonth = new(windowEnd.Year, windowEnd.Month, 1);

        while (cursor <= endMonth)
        {
            DateTime periodStartUtc = new(cursor.Year, cursor.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            DateTime periodEndUtcExclusive = periodStartUtc.AddMonths(1);

            decimal inflow = invoices
                .Where(invoice => invoice.PaidAt.HasValue)
                .Where(invoice => invoice.PaidAt!.Value >= periodStartUtc && invoice.PaidAt!.Value < periodEndUtcExclusive)
                .Sum(invoice => invoice.AmountPaid);

            cashflow.Add(new CashflowPointDto(
                cursor,
                RoundMoney(inflow),
                0m,
                RoundMoney(inflow)));

            cursor = cursor.AddMonths(1);
        }

        return cashflow.AsReadOnly();
    }

    private static decimal RoundMoney(decimal value) =>
        decimal.Round(value, 2, MidpointRounding.ToEven);
}
