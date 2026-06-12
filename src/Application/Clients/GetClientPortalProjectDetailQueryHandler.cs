using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalProjectDetailQueryHandler
    : IRequestHandler<GetClientPortalProjectDetailQuery, Result<ClientPortalProjectDetailDto>>
{
    private static readonly Error ProjectNotFoundError = new(
        "Projects.NotFound",
        "Project was not found.",
        ErrorType.NotFound);

    private readonly ICurrentUser _currentUser;
    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IClientPortalProjectsReader _projectsReader;

    public GetClientPortalProjectDetailQueryHandler(
        ICurrentUser currentUser,
        ICurrentClientResolver currentClientResolver,
        IClientPortalProjectsReader projectsReader)
    {
        _currentUser = currentUser;
        _currentClientResolver = currentClientResolver;
        _projectsReader = projectsReader;
    }

    public async Task<Result<ClientPortalProjectDetailDto>> Handle(
        GetClientPortalProjectDetailQuery request,
        CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is null)
        {
            return Result<ClientPortalProjectDetailDto>.Failure(new Error(
                "Auth.InvalidUserContext",
                "Authenticated user context is invalid.",
                ErrorType.Forbidden));
        }

        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<ClientPortalProjectDetailDto>.Failure(clientIdResult.Errors);
        }

        ClientPortalProjectDetailDto? detail = await _projectsReader.GetProjectDetailAsync(
            clientIdResult.Value,
            request.ProjectId,
            _currentUser.UserId.Value,
            cancellationToken);

        if (detail is null)
        {
            return Result<ClientPortalProjectDetailDto>.Failure(ProjectNotFoundError);
        }

        return Result<ClientPortalProjectDetailDto>.Success(detail);
    }
}
