using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Messaging;
using Application.Messaging.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalMessageAttachmentUploadUrlCommandHandler
    : IRequestHandler<GetClientPortalMessageAttachmentUploadUrlCommand, Result<MessageAttachmentUploadUrlResultDto>>
{
    private readonly ICurrentUser _currentUser;
    private readonly IClientPortalThreadAccessService _threadAccessService;
    private readonly ISender _sender;

    public GetClientPortalMessageAttachmentUploadUrlCommandHandler(
        ICurrentUser currentUser,
        IClientPortalThreadAccessService threadAccessService,
        ISender sender)
    {
        _currentUser = currentUser;
        _threadAccessService = threadAccessService;
        _sender = sender;
    }

    public async Task<Result<MessageAttachmentUploadUrlResultDto>> Handle(
        GetClientPortalMessageAttachmentUploadUrlCommand request,
        CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is null)
        {
            return Result<MessageAttachmentUploadUrlResultDto>.Failure(new Error(
                "Auth.InvalidUserContext",
                "Authenticated user context is invalid.",
                ErrorType.Forbidden));
        }

        Result<MessageThread> accessResult = await _threadAccessService.EnsureThreadAccessAsync(
            request.ThreadId,
            _currentUser.UserId.Value,
            addParticipantIfMissing: true,
            cancellationToken);
        if (accessResult.IsFailed)
        {
            return Result<MessageAttachmentUploadUrlResultDto>.Failure(accessResult.Errors);
        }

        return await _sender.Send(
            new GetMessageAttachmentUploadUrlCommand(
                request.ThreadId,
                _currentUser.UserId.Value,
                new MessageAttachmentMetadataDto(
                    request.FileName,
                    request.ContentType,
                    request.SizeBytes,
                    Url: string.Empty)),
            cancellationToken);
    }
}
