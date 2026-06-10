namespace Application.Clients.Dtos;

public sealed record ClientPortalNoticeListItemDto(
    Guid Id,
    string Title,
    string Content,
    DateTime PublishedAt,
    DateTime? ExpiresAt,
    bool IsRead,
    DateTime? ReadAtUtc);

public sealed record ClientPortalNoticesResultDto(
    IReadOnlyList<ClientPortalNoticeListItemDto> Notices,
    int UnreadCount);

public sealed record ClientPortalNoticesSummaryDto(
    int UnreadCount,
    int TotalCount);
