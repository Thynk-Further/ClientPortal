using Application.Messaging.Dtos;
using Domain;

namespace Application.Clients.Dtos;

public sealed record ClientPortalInboxThreadDto(
    Guid Id,
    Guid? ProjectId,
    string Subject,
    DateTime LastMessageAt,
    int UnreadCount);

public sealed record ClientPortalMessageThreadsResultDto(
    IReadOnlyList<ClientPortalInboxThreadDto> Threads,
    int TotalCount,
    int Page,
    int PageSize);

public sealed record ClientPortalMessageDto(
    Guid Id,
    Guid ThreadId,
    Guid SenderId,
    string SenderRole,
    string Content,
    MessageStatus Status,
    DateTime SentAt,
    MessageAttachmentMetadataDto? Attachment,
    DateTime? AttachmentExpiresAt);

public sealed record ClientPortalThreadMessagesResultDto(
    IReadOnlyList<ClientPortalMessageDto> Messages,
    int TotalCount,
    int Page,
    int PageSize);
