using MediatR;
using Shared;

namespace Application.Finance;

public sealed record RejectClientPortalQuotationCommand(Guid QuotationId) : IRequest<Result>;
