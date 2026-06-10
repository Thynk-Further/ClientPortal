using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Application.Documents.Abstractions;
using Domain;
using MediatR;
using Microsoft.Extensions.Logging;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalDocumentDownloadUrlQueryHandler
    : IRequestHandler<GetClientPortalDocumentDownloadUrlQuery, Result<ClientPortalDocumentDownloadDto>>
{
    private static readonly Error DocumentNotFoundError = new(
        "Documents.NotFound",
        "Document was not found.",
        ErrorType.NotFound);

    private static readonly Error DocumentNotDownloadableError = new(
        "Documents.NotDownloadable",
        "This document cannot be downloaded.",
        ErrorType.Conflict);

    private static readonly Error DownloadUrlGenerationFailedError = new(
        "Documents.DownloadUrlGenerationFailed",
        "Failed to generate a download URL.",
        ErrorType.Unexpected);

    private static readonly TimeSpan DownloadUrlExpiry = TimeSpan.FromMinutes(15);

    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IContractRepository _contractRepository;
    private readonly IContractDownloadUrlService _contractDownloadUrlService;
    private readonly ILogger<GetClientPortalDocumentDownloadUrlQueryHandler> _logger;

    public GetClientPortalDocumentDownloadUrlQueryHandler(
        ICurrentClientResolver currentClientResolver,
        IContractRepository contractRepository,
        IContractDownloadUrlService contractDownloadUrlService,
        ILogger<GetClientPortalDocumentDownloadUrlQueryHandler> logger)
    {
        _currentClientResolver = currentClientResolver;
        _contractRepository = contractRepository;
        _contractDownloadUrlService = contractDownloadUrlService;
        _logger = logger;
    }

    public async Task<Result<ClientPortalDocumentDownloadDto>> Handle(
        GetClientPortalDocumentDownloadUrlQuery request,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<ClientPortalDocumentDownloadDto>.Failure(clientIdResult.Errors);
        }

        Contract? contract = await _contractRepository.FindByIdAsync(request.DocumentId, cancellationToken);
        if (contract is null || contract.ClientId != clientIdResult.Value || contract.Status == ContractStatus.Draft)
        {
            return Result<ClientPortalDocumentDownloadDto>.Failure(DocumentNotFoundError);
        }

        if (contract.Status == ContractStatus.Cancelled)
        {
            return Result<ClientPortalDocumentDownloadDto>.Failure(DocumentNotDownloadableError);
        }

        try
        {
            DocumentDownloadUrlIssueResult issueResult = await _contractDownloadUrlService.IssuePresignedGetUrlAsync(
                contract,
                DownloadUrlExpiry,
                cancellationToken);

            ClientPortalDocumentDownloadDto result = new(
                issueResult.DownloadUrl,
                issueResult.ExpiresAtUtc);

            return Result<ClientPortalDocumentDownloadDto>.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to issue download URL for client portal document {DocumentId}.",
                request.DocumentId);

            return Result<ClientPortalDocumentDownloadDto>.Failure(DownloadUrlGenerationFailedError);
        }
    }
}
