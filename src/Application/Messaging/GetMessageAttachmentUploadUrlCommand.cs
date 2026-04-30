using Application.Messaging.Dtos;
using MediatR;
using Shared;

namespace Application.Messaging;

public sealed record GetMessageAttachmentUploadUrlCommand(
    Guid ThreadId,
    Guid UserId,
    MessageAttachmentMetadataDto Attachment) : IRequest<Result<MessageAttachmentUploadUrlResultDto>>;
