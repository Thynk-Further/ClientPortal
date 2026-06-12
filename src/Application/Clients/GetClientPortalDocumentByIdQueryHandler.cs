using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Application.Documents.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalDocumentByIdQueryHandler
    : IRequestHandler<GetClientPortalDocumentByIdQuery, Result<ClientPortalDocumentDetailDto>>
{
    private static readonly Error DocumentNotFoundError = new(
        "Documents.NotFound",
        "Document was not found.",
        ErrorType.NotFound);

    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IContractRepository _contractRepository;

    public GetClientPortalDocumentByIdQueryHandler(
        ICurrentClientResolver currentClientResolver,
        IContractRepository contractRepository)
    {
        _currentClientResolver = currentClientResolver;
        _contractRepository = contractRepository;
    }

    public async Task<Result<ClientPortalDocumentDetailDto>> Handle(
        GetClientPortalDocumentByIdQuery request,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<ClientPortalDocumentDetailDto>.Failure(clientIdResult.Errors);
        }

        Contract? contract = await _contractRepository.FindByIdAsync(request.DocumentId, cancellationToken);
        if (contract is null || contract.ClientId != clientIdResult.Value || contract.Status == ContractStatus.Draft)
        {
            return Result<ClientPortalDocumentDetailDto>.Failure(DocumentNotFoundError);
        }

        ClientPortalDocumentDetailDto detail = new(
            contract.Id,
            contract.Title,
            "contract",
            contract.Status,
            contract.SignedAt,
            contract.ExpiresAt,
            contract.Parties,
            contract.CreatedAt,
            contract.UpdatedAt,
            RequiresSignature: contract.Status == ContractStatus.SentForSigning,
            CanDownload: contract.Status is not ContractStatus.Cancelled);

        return Result<ClientPortalDocumentDetailDto>.Success(detail);
    }
}
