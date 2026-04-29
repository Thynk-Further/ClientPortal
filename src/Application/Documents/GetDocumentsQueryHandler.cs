using Application.Documents.Abstractions;
using Application.Documents.Dtos;
using MediatR;
using Shared;

namespace Application.Documents;

public sealed class GetDocumentsQueryHandler : IRequestHandler<GetDocumentsQuery, Result<PagedResult<DocumentListItemDto>>>
{
    private readonly IDocumentRepository _documentRepository;

    public GetDocumentsQueryHandler(IDocumentRepository documentRepository)
    {
        _documentRepository = documentRepository;
    }

    public async Task<Result<PagedResult<DocumentListItemDto>>> Handle(
        GetDocumentsQuery request,
        CancellationToken cancellationToken)
    {
        PagedResult<DocumentListItemDto> documents = await _documentRepository.GetPagedAsync(
            page: request.Page,
            pageSize: request.PageSize,
            type: request.Type,
            projectId: request.ProjectId,
            clientId: request.ClientId,
            createdFromUtc: request.CreatedFromUtc,
            createdToUtc: request.CreatedToUtc,
            cancellationToken: cancellationToken);

        return Result<PagedResult<DocumentListItemDto>>.Success(documents);
    }
}
