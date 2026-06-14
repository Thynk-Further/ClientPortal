using Application.Messaging.Abstractions;
using Application.Messaging.Dtos;
using MediatR;
using Shared;

namespace Application.Messaging;

public sealed class GetNoticeAttachmentUploadUrlCommandHandler
    : IRequestHandler<GetNoticeAttachmentUploadUrlCommand, Result<MessageAttachmentUploadUrlResultDto>>
{
    private readonly INoticeAttachmentUploadUrlService _uploadUrlService;

    public GetNoticeAttachmentUploadUrlCommandHandler(INoticeAttachmentUploadUrlService uploadUrlService)
    {
        _uploadUrlService = uploadUrlService;
    }

    public async Task<Result<MessageAttachmentUploadUrlResultDto>> Handle(
        GetNoticeAttachmentUploadUrlCommand request,
        CancellationToken cancellationToken)
    {
        MessageAttachmentUploadUrlResultDto result = await _uploadUrlService.IssueUploadUrlAsync(
            request.UserId,
            request.Attachment,
            cancellationToken);

        return Result<MessageAttachmentUploadUrlResultDto>.Success(result);
    }
}
