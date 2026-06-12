using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalProjectsQueryHandler
    : IRequestHandler<GetClientPortalProjectsQuery, Result<ClientPortalProjectsResultDto>>
{
    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IClientPortalProjectsReader _projectsReader;

    public GetClientPortalProjectsQueryHandler(
        ICurrentClientResolver currentClientResolver,
        IClientPortalProjectsReader projectsReader)
    {
        _currentClientResolver = currentClientResolver;
        _projectsReader = projectsReader;
    }

    public async Task<Result<ClientPortalProjectsResultDto>> Handle(
        GetClientPortalProjectsQuery request,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<ClientPortalProjectsResultDto>.Failure(clientIdResult.Errors);
        }

        ClientPortalProjectsResultDto projects = await _projectsReader.GetProjectsAsync(
            clientIdResult.Value,
            cancellationToken);

        return Result<ClientPortalProjectsResultDto>.Success(projects);
    }
}
