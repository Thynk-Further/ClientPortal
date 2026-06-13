using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Application.Messaging.Abstractions;
using Application.Messaging.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalMessagesSummaryQueryHandler
    : IRequestHandler<GetClientPortalMessagesSummaryQuery, Result<ClientPortalMessagesSummaryDto>>
{
    private const int SummaryPageSize = 200;

    private readonly ICurrentUser _currentUser;
    private readonly IClientPortalThreadAccessService _threadAccessService;
    private readonly IMessageThreadRepository _messageThreadRepository;

    public GetClientPortalMessagesSummaryQueryHandler(
        ICurrentUser currentUser,
        IClientPortalThreadAccessService threadAccessService,
        IMessageThreadRepository messageThreadRepository)
    {
        _currentUser = currentUser;
        _threadAccessService = threadAccessService;
        _messageThreadRepository = messageThreadRepository;
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

        Result<Guid> clientIdResult = await _threadAccessService.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<ClientPortalMessagesSummaryDto>.Failure(clientIdResult.Errors);
        }

        PagedResult<MessageThreadListItemDto> threads = await _messageThreadRepository.GetPagedForClientAsync(
            clientIdResult.Value,
            _currentUser.UserId.Value,
            page: 1,
            SummaryPageSize,
            cancellationToken);

        ClientPortalMessagesSummaryDto summary = new(
            threads.Items.Sum(thread => thread.UnreadCount),
            threads.TotalCount);

        return Result<ClientPortalMessagesSummaryDto>.Success(summary);
    }
}
