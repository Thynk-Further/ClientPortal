using Application.Messaging.Abstractions;
using Application.Messaging.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Messaging;

public sealed class GetMessageAttachmentUploadUrlCommandHandler
    : IRequestHandler<GetMessageAttachmentUploadUrlCommand, Result<MessageAttachmentUploadUrlResultDto>>
{
    private static readonly Error ThreadNotFoundError = new(
        "Messages.ThreadNotFound",
        "Message thread was not found.",
        ErrorType.NotFound);

    private static readonly Error SenderNotParticipantError = new(
        "Messages.SenderNotParticipant",
        "Sender is not a participant in this thread.",
        ErrorType.Forbidden);

    private readonly IMessageThreadRepository _messageThreadRepository;
    private readonly IMessageAttachmentUploadUrlService _uploadUrlService;

    public GetMessageAttachmentUploadUrlCommandHandler(
        IMessageThreadRepository messageThreadRepository,
        IMessageAttachmentUploadUrlService uploadUrlService)
    {
        _messageThreadRepository = messageThreadRepository;
        _uploadUrlService = uploadUrlService;
    }

    public async Task<Result<MessageAttachmentUploadUrlResultDto>> Handle(
        GetMessageAttachmentUploadUrlCommand request,
        CancellationToken cancellationToken)
    {
        MessageThread? thread = await _messageThreadRepository.FindByIdAsync(request.ThreadId, cancellationToken);
        if (thread is null)
        {
            return Result<MessageAttachmentUploadUrlResultDto>.Failure(ThreadNotFoundError);
        }

        if (!thread.Participants.Contains(request.UserId))
        {
            return Result<MessageAttachmentUploadUrlResultDto>.Failure(SenderNotParticipantError);
        }

        MessageAttachmentUploadUrlResultDto result = await _uploadUrlService.IssueUploadUrlAsync(
            request.ThreadId,
            request.UserId,
            request.Attachment,
            cancellationToken);

        return Result<MessageAttachmentUploadUrlResultDto>.Success(result);
    }
}
