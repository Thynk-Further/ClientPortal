using MediatR;
using Shared;

namespace Application.Finance;

public sealed record AcceptClientPortalQuotationCommand(Guid QuotationId) : IRequest<Result>;
