using Domain;

namespace Application.Invoices;

internal static class QuoteStaffAccess
{
    internal static bool MatchesClientScope(Quote quote, Guid? clientId)
    {
        if (!quote.ClientId.HasValue)
        {
            return !clientId.HasValue || clientId.Value == Guid.Empty;
        }

        return clientId.HasValue && clientId.Value != Guid.Empty && quote.ClientId == clientId;
    }
}
