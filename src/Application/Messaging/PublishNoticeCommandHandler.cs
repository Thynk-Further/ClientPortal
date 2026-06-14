using Application.Abstractions;
using Application.Messaging.Abstractions;
using Application.Messaging.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Messaging;

public sealed class PublishNoticeCommandHandler : IRequestHandler<PublishNoticeCommand, Result<Guid>>
{
    private static readonly Error AttachmentScanFailedError = new(
        "Notices.AttachmentScanFailed",
        "One or more attachments failed security validation.",
        ErrorType.Validation);

    private readonly INoticeRepository _noticeRepository;
    private readonly IMessageAttachmentMalwareScanService _attachmentMalwareScanService;
    private readonly IUnitOfWork _unitOfWork;

    public PublishNoticeCommandHandler(
        INoticeRepository noticeRepository,
        IMessageAttachmentMalwareScanService attachmentMalwareScanService,
        IUnitOfWork unitOfWork)
    {
        _noticeRepository = noticeRepository;
        _attachmentMalwareScanService = attachmentMalwareScanService;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(PublishNoticeCommand request, CancellationToken cancellationToken)
    {
        if (request.Attachments is not null)
        {
            foreach (MessageAttachmentMetadataDto attachment in request.Attachments)
            {
                Result scanResult = await _attachmentMalwareScanService.ValidateCleanAsync(attachment, cancellationToken);
                if (scanResult.IsFailed)
                {
                    return Result<Guid>.Failure(scanResult.Errors.Count > 0 ? scanResult.Errors : [AttachmentScanFailedError]);
                }
            }
        }

        IReadOnlyCollection<MessageAttachmentMetadata>? attachments = request.Attachments is null
            ? null
            : request.Attachments
                .Select(attachment => new MessageAttachmentMetadata(
                    attachment.FileName,
                    attachment.ContentType,
                    attachment.SizeBytes,
                    attachment.Url))
                .ToList();

        DateTime publishedAt = DateTime.UtcNow;
        Notice notice = Notice.Create(
            id: Guid.CreateVersion7(),
            title: request.Title,
            content: request.Content,
            publishedAt: publishedAt,
            expiresAt: request.ExpiresAt,
            isActive: true,
            targetClientIds: request.TargetClientIds,
            attachments: attachments);

        _noticeRepository.Add(notice);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(notice.Id);
    }
}
