using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalMeetingsQueryHandler
    : IRequestHandler<GetClientPortalMeetingsQuery, Result<ClientPortalMeetingsResultDto>>
{
    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IClientPortalMeetingsReader _meetingsReader;

    public GetClientPortalMeetingsQueryHandler(
        ICurrentClientResolver currentClientResolver,
        IClientPortalMeetingsReader meetingsReader)
    {
        _currentClientResolver = currentClientResolver;
        _meetingsReader = meetingsReader;
    }

    public async Task<Result<ClientPortalMeetingsResultDto>> Handle(
        GetClientPortalMeetingsQuery request,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<ClientPortalMeetingsResultDto>.Failure(clientIdResult.Errors);
        }

        ClientPortalMeetingsResultDto meetings = await _meetingsReader.GetMeetingsAsync(
            clientIdResult.Value,
            cancellationToken);

        return Result<ClientPortalMeetingsResultDto>.Success(meetings);
    }
}
