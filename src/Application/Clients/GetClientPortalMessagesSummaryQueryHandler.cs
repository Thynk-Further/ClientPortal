using Application.Abstractions;
using Application.Clients.Dtos;
using Application.Messaging;
using Application.Messaging.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalMessagesSummaryQueryHandler
    : IRequestHandler<GetClientPortalMessagesSummaryQuery, Result<ClientPortalMessagesSummaryDto>>
{
    private const int SummaryPageSize = 200;

    private readonly ICurrentUser _currentUser;
    private readonly ISender _sender;

    public GetClientPortalMessagesSummaryQueryHandler(ICurrentUser currentUser, ISender sender)
    {
        _currentUser = currentUser;
        _sender = sender;
    }

    public async Task<Result<ClientPortalMessagesSummaryDto>> Handle(
        GetClientPortalMessagesSummaryQuery request,
        CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is null)
        {
            return Result<ClientPortalMessagesSummaryDto>.Failure(new Error(
                "Auth.InvalidUserContext",
                "Authenticated user context is invalid.",
                ErrorType.Forbidden));
        }

        Result<PagedResult<MessageThreadListItemDto>> threadsResult = await _sender.Send(
            new GetThreadsQuery(_currentUser.UserId.Value, 1, SummaryPageSize),
            cancellationToken);

        if (threadsResult.IsFailed || threadsResult.Value is null)
        {
            return Result<ClientPortalMessagesSummaryDto>.Failure(threadsResult.Errors);
        }

        ClientPortalMessagesSummaryDto summary = new(
            threadsResult.Value.Items.Sum(thread => thread.UnreadCount),
            threadsResult.Value.TotalCount);

        return Result<ClientPortalMessagesSummaryDto>.Success(summary);
    }
}
