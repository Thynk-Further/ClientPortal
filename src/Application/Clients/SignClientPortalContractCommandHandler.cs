using Application.Clients.Abstractions;
using Application.Documents;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class SignClientPortalContractCommandHandler
    : IRequestHandler<SignClientPortalContractCommand, Result>
{
    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly ISender _sender;

    public SignClientPortalContractCommandHandler(
        ICurrentClientResolver currentClientResolver,
        ISender sender)
    {
        _currentClientResolver = currentClientResolver;
        _sender = sender;
    }

    public async Task<Result> Handle(
        SignClientPortalContractCommand request,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result.Failure(clientIdResult.Errors);
        }

        return await _sender.Send(
            new RecordSignatureCommand(
                request.ContractId,
                clientIdResult.Value,
                DateTime.UtcNow),
            cancellationToken);
    }
}
