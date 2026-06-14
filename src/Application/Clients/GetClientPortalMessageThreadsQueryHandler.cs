using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Application.Messaging.Abstractions;
using Application.Messaging.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalMessageThreadsQueryHandler
    : IRequestHandler<GetClientPortalMessageThreadsQuery, Result<ClientPortalMessageThreadsResultDto>>
{
    private readonly ICurrentUser _currentUser;
    private readonly IClientPortalThreadAccessService _threadAccessService;
    private readonly IMessageThreadRepository _messageThreadRepository;

    public GetClientPortalMessageThreadsQueryHandler(
        ICurrentUser currentUser,
        IClientPortalThreadAccessService threadAccessService,
        IMessageThreadRepository messageThreadRepository)
    {
        _currentUser = currentUser;
        _threadAccessService = threadAccessService;
        _messageThreadRepository = messageThreadRepository;
    }

    public async Task<Result<ClientPortalMessageThreadsResultDto>> Handle(
        GetClientPortalMessageThreadsQuery request,
        CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is null)
        {
            return Result<ClientPortalMessageThreadsResultDto>.Failure(new Error(
                "Auth.InvalidUserContext",
                "Authenticated user context is invalid.",
                ErrorType.Forbidden));
        }

        Result<Guid> clientIdResult = await _threadAccessService.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<ClientPortalMessageThreadsResultDto>.Failure(clientIdResult.Errors);
        }

        PagedResult<MessageThreadListItemDto> threads = await _messageThreadRepository.GetPagedForClientAsync(
            clientIdResult.Value,
            _currentUser.UserId.Value,
            request.Page,
            request.PageSize,
            cancellationToken);

        IReadOnlyList<ClientPortalInboxThreadDto> items = threads.Items
            .Select(thread => new ClientPortalInboxThreadDto(
                thread.Id,
                thread.ProjectId,
                thread.Subject,
                thread.LastMessageAt,
                thread.UnreadCount))
            .ToList();

        ClientPortalMessageThreadsResultDto result = new(
            items,
            threads.TotalCount,
            threads.Page,
            threads.PageSize);

        return Result<ClientPortalMessageThreadsResultDto>.Success(result);
    }
}
