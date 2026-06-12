using Domain;

namespace Application.Clients.Dtos;

public sealed record ClientPortalRequestsResultDto(
    IReadOnlyList<ClientPortalRequestListItemDto> Requests);

public sealed record ClientPortalRequestListItemDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    string Title,
    string Description,
    ClientRequestStatus Status,
    ClientRequestPriority Priority,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);
