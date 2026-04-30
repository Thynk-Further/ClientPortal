using Application.Abstractions;
using Application.Messaging.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Messaging;

public sealed class SendMessageCommandHandler : IRequestHandler<SendMessageCommand, Result<Guid>>
{
    private static readonly Error ThreadNotFoundError = new(
        "Messages.ThreadNotFound",
        "Message thread was not found.",
        ErrorType.NotFound);

    private static readonly Error SenderNotParticipantError = new(
        "Messages.SenderNotParticipant",
        "Sender is not a participant in this thread.",
        ErrorType.Forbidden);
    
    private static readonly Error IdempotencyPayloadMismatchError = new(
        "Messages.IdempotencyPayloadMismatch",
        "ClientMessageId already exists with different message payload.",
        ErrorType.Conflict);

    private static readonly Error ReplyTargetNotFoundError = new(
        "Messages.ReplyTargetNotFound",
        "Reply target message was not found in this thread.",
        ErrorType.NotFound);

    private static readonly Error AttachmentScanFailedError = new(
        "Messages.AttachmentScanFailed",
        "Attachment failed malware validation.",
        ErrorType.Validation);

    private readonly IMessageThreadRepository _messageThreadRepository;
    private readonly IMessageRepository _messageRepository;
    private readonly IMessageAttachmentMalwareScanService _attachmentMalwareScanService;
    private readonly ICurrentTenant _currentTenant;
    private readonly IUnitOfWork _unitOfWork;

    public SendMessageCommandHandler(
        IMessageThreadRepository messageThreadRepository,
        IMessageRepository messageRepository,
        IMessageAttachmentMalwareScanService attachmentMalwareScanService,
        ICurrentTenant currentTenant,
        IUnitOfWork unitOfWork)
    {
        _messageThreadRepository = messageThreadRepository;
        _messageRepository = messageRepository;
        _attachmentMalwareScanService = attachmentMalwareScanService;
        _currentTenant = currentTenant;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(SendMessageCommand request, CancellationToken cancellationToken)
    {
        MessageThread? thread = await _messageThreadRepository.FindByIdAsync(request.ThreadId, cancellationToken);
        if (thread is null)
        {
            return Result<Guid>.Failure(ThreadNotFoundError);
        }

        if (!thread.Participants.Contains(request.SenderId))
        {
            return Result<Guid>.Failure(SenderNotParticipantError);
        }

        Message? existingMessage = await _messageRepository.FindByClientMessageIdAsync(
            request.ThreadId,
            request.ClientMessageId,
            cancellationToken);
        if (existingMessage is not null)
        {
            if (existingMessage.SenderId != request.SenderId
                || !string.Equals(existingMessage.Content, request.Content.Trim(), StringComparison.Ordinal)
                || !string.Equals(existingMessage.SenderRole, request.SenderRole.Trim(), StringComparison.Ordinal)
                || existingMessage.ReplyToMessageId != request.ReplyToMessageId
                || !string.Equals(existingMessage.EmojiReaction ?? string.Empty, request.EmojiReaction?.Trim() ?? string.Empty, StringComparison.Ordinal)
                || !string.Equals(existingMessage.AttachmentFileName ?? string.Empty, request.Attachment?.FileName?.Trim() ?? string.Empty, StringComparison.Ordinal)
                || !string.Equals(existingMessage.AttachmentContentType ?? string.Empty, request.Attachment?.ContentType?.Trim() ?? string.Empty, StringComparison.Ordinal)
                || existingMessage.AttachmentSizeBytes != request.Attachment?.SizeBytes
                || !string.Equals(existingMessage.AttachmentUrl ?? string.Empty, request.Attachment?.Url?.Trim() ?? string.Empty, StringComparison.Ordinal))
            {
                return Result<Guid>.Failure(IdempotencyPayloadMismatchError);
            }

            return Result<Guid>.Success(existingMessage.Id);
        }

        if (request.ReplyToMessageId.HasValue)
        {
            Message? replyTarget = await _messageRepository.FindByIdAsync(request.ReplyToMessageId.Value, cancellationToken);
            if (replyTarget is null || replyTarget.ThreadId != request.ThreadId)
            {
                return Result<Guid>.Failure(ReplyTargetNotFoundError);
            }
        }

        if (request.Attachment is not null)
        {
            Result scanResult = await _attachmentMalwareScanService.ValidateCleanAsync(request.Attachment, cancellationToken);
            if (scanResult.IsFailed)
            {
                return Result<Guid>.Failure(scanResult.Errors.Count > 0 ? scanResult.Errors : [AttachmentScanFailedError]);
            }
        }

        MessageAttachmentMetadata? attachment = request.Attachment is null
            ? null
            : new MessageAttachmentMetadata(
                request.Attachment.FileName,
                request.Attachment.ContentType,
                request.Attachment.SizeBytes,
                request.Attachment.Url);
        DateTime sentAt = DateTime.UtcNow;
        DateTime? attachmentExpiresAt = attachment is null
            ? null
            : sentAt.AddDays(Math.Max(1, _currentTenant.Settings?.AttachmentExpiryDays ?? 90));

        long sequenceNumber = await _messageRepository.GetNextSequenceNumberAsync(request.ThreadId, cancellationToken);

        Message message = Message.Create(
            id: Guid.CreateVersion7(),
            threadId: request.ThreadId,
            senderId: request.SenderId,
            senderRole: request.SenderRole,
            clientMessageId: request.ClientMessageId,
            sequenceNumber: sequenceNumber,
            content: request.Content,
            sentAt: sentAt,
            replyToMessageId: request.ReplyToMessageId,
            emojiReaction: request.EmojiReaction,
            attachment: attachment,
            attachmentExpiresAt: attachmentExpiresAt);

        thread.TouchLastMessageAt(sentAt);
        thread.RaiseMessageSent(message.Id, request.SenderId, sentAt);

        _messageRepository.Add(message);
        _messageThreadRepository.Update(thread);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(message.Id);
    }
}
