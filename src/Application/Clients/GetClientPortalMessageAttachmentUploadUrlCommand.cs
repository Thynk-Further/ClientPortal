using Application.Messaging.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record GetClientPortalMessageAttachmentUploadUrlCommand(
    Guid ThreadId,
    string FileName,
    string ContentType,
    long SizeBytes) : IRequest<Result<MessageAttachmentUploadUrlResultDto>>;
