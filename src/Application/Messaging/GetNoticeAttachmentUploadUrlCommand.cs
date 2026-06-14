using Application.Messaging.Dtos;
using MediatR;
using Shared;

namespace Application.Messaging;

public sealed record GetNoticeAttachmentUploadUrlCommand(
    Guid UserId,
    MessageAttachmentMetadataDto Attachment) : IRequest<Result<MessageAttachmentUploadUrlResultDto>>;
