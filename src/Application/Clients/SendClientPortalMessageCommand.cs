using Application.Messaging.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record SendClientPortalMessageCommand(
    Guid ThreadId,
    string ClientMessageId,
    string Content,
    MessageAttachmentMetadataDto? Attachment = null) : IRequest<Result<Guid>>;
