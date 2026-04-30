using MediatR;
using Shared;

namespace Application.Messaging;

public sealed record UpdateNoticeCommand(
    Guid NoticeId,
    string Title,
    string Content,
    DateTime? ExpiresAt,
    bool IsActive,
    IReadOnlyCollection<Guid>? TargetClientIds) : IRequest<Result>;
