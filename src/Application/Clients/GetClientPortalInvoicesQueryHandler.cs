using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalInvoicesQueryHandler
    : IRequestHandler<GetClientPortalInvoicesQuery, Result<ClientPortalInvoicesResultDto>>
{
    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IClientPortalInvoicesReader _invoicesReader;

    public GetClientPortalInvoicesQueryHandler(
        ICurrentClientResolver currentClientResolver,
        IClientPortalInvoicesReader invoicesReader)
    {
        _currentClientResolver = currentClientResolver;
        _invoicesReader = invoicesReader;
    }

    public async Task<Result<ClientPortalInvoicesResultDto>> Handle(
        GetClientPortalInvoicesQuery request,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<ClientPortalInvoicesResultDto>.Failure(clientIdResult.Errors);
        }

        ClientPortalInvoicesResultDto invoices = await _invoicesReader.GetInvoicesAsync(
            clientIdResult.Value,
            cancellationToken);

        return Result<ClientPortalInvoicesResultDto>.Success(invoices);
    }
}
