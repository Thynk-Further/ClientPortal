using MediatR;
using Shared;
using Application.Messaging.Dtos;

namespace Application.Messaging;

public sealed record SendMessageCommand(
    Guid ThreadId,
    Guid SenderId,
    string SenderRole,
    string ClientMessageId,
    string Content,
    Guid? ReplyToMessageId,
    string? EmojiReaction,
    MessageAttachmentMetadataDto? Attachment) : IRequest<Result<Guid>>;
