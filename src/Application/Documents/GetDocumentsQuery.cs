using Application.Documents.Dtos;
using MediatR;
using Shared;

namespace Application.Documents;

public sealed record GetDocumentsQuery(
    int Page = 1,
    int PageSize = 20,
    string? Type = null,
    Guid? ProjectId = null,
    Guid? ClientId = null,
    DateTime? CreatedFromUtc = null,
    DateTime? CreatedToUtc = null) : IRequest<Result<PagedResult<DocumentListItemDto>>>;
