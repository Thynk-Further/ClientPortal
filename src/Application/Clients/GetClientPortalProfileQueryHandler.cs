using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalProfileQueryHandler
    : IRequestHandler<GetClientPortalProfileQuery, Result<ClientPortalProfileDto>>
{
    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IClientPortalProfileReader _profileReader;

    public GetClientPortalProfileQueryHandler(
        ICurrentClientResolver currentClientResolver,
        IClientPortalProfileReader profileReader)
    {
        _currentClientResolver = currentClientResolver;
        _profileReader = profileReader;
    }

    public async Task<Result<ClientPortalProfileDto>> Handle(
        GetClientPortalProfileQuery request,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<ClientPortalProfileDto>.Failure(clientIdResult.Errors);
        }

        ClientPortalProfileDto profile = await _profileReader.GetProfileAsync(
            clientIdResult.Value,
            cancellationToken);

        return Result<ClientPortalProfileDto>.Success(profile);
    }
}
