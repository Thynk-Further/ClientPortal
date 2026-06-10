using Application.Abstractions;
using Application.Clients.Dtos;
using Application.Messaging;
using Application.Messaging.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalMessageThreadsQueryHandler
    : IRequestHandler<GetClientPortalMessageThreadsQuery, Result<ClientPortalMessageThreadsResultDto>>
{
    private readonly ICurrentUser _currentUser;
    private readonly ISender _sender;

    public GetClientPortalMessageThreadsQueryHandler(ICurrentUser currentUser, ISender sender)
    {
        _currentUser = currentUser;
        _sender = sender;
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

        Result<PagedResult<MessageThreadListItemDto>> threadsResult = await _sender.Send(
            new GetThreadsQuery(_currentUser.UserId.Value, request.Page, request.PageSize),
            cancellationToken);

        if (threadsResult.IsFailed || threadsResult.Value is null)
        {
            return Result<ClientPortalMessageThreadsResultDto>.Failure(threadsResult.Errors);
        }

        PagedResult<MessageThreadListItemDto> threads = threadsResult.Value;
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
