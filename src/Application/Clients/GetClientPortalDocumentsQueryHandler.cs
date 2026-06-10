using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalDocumentsQueryHandler
    : IRequestHandler<GetClientPortalDocumentsQuery, Result<ClientPortalDocumentsResultDto>>
{
    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IClientPortalDocumentsReader _documentsReader;

    public GetClientPortalDocumentsQueryHandler(
        ICurrentClientResolver currentClientResolver,
        IClientPortalDocumentsReader documentsReader)
    {
        _currentClientResolver = currentClientResolver;
        _documentsReader = documentsReader;
    }

    public async Task<Result<ClientPortalDocumentsResultDto>> Handle(
        GetClientPortalDocumentsQuery request,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<ClientPortalDocumentsResultDto>.Failure(clientIdResult.Errors);
        }

        ClientPortalDocumentsResultDto documents = await _documentsReader.GetDocumentsAsync(
            clientIdResult.Value,
            cancellationToken);

        return Result<ClientPortalDocumentsResultDto>.Success(documents);
    }
}
