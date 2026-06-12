using Application.Clients.Abstractions;
using Application.Projects;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class SubmitClientPortalRequestCommandHandler
    : IRequestHandler<SubmitClientPortalRequestCommand, Result<Guid>>
{
    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly ISender _sender;

    public SubmitClientPortalRequestCommandHandler(
        ICurrentClientResolver currentClientResolver,
        ISender sender)
    {
        _currentClientResolver = currentClientResolver;
        _sender = sender;
    }

    public async Task<Result<Guid>> Handle(
        SubmitClientPortalRequestCommand request,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<Guid>.Failure(clientIdResult.Errors);
        }

        return await _sender.Send(
            new SubmitClientRequestCommand(
                clientIdResult.Value,
                request.ProjectId,
                request.Title,
                request.Description,
                request.Priority),
            cancellationToken);
    }
}
