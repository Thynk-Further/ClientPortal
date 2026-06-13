using MediatR;
using Shared;

namespace Application.Finance;

public sealed record RejectPurchaseOrderCommand(Guid PurchaseOrderId, Guid ClientId) : IRequest<Result>;
