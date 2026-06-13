using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Messaging.Abstractions;
using Domain;
using Shared;

namespace Infrastructure.Clients;

public sealed class ClientPortalThreadAccessService : IClientPortalThreadAccessService
{
    private static readonly Error ThreadNotFoundError = new(
        "Messages.ThreadNotFound",
        "Message thread was not found.",
        ErrorType.NotFound);

    private static readonly Error ThreadAccessDeniedError = new(
        "Messages.ThreadAccessDenied",
        "You are not allowed to access this message thread.",
        ErrorType.Forbidden);

    private static readonly Error SenderNotParticipantError = new(
        "Messages.SenderNotParticipant",
        "Sender is not a participant in this thread.",
        ErrorType.Forbidden);

    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IMessageThreadRepository _messageThreadRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ClientPortalThreadAccessService(
        ICurrentClientResolver currentClientResolver,
        IMessageThreadRepository messageThreadRepository,
        IUnitOfWork unitOfWork)
    {
        _currentClientResolver = currentClientResolver;
        _messageThreadRepository = messageThreadRepository;
        _unitOfWork = unitOfWork;
    }

    public Task<Result<Guid>> ResolveClientIdAsync(CancellationToken cancellationToken = default)
    {
        return _currentClientResolver.ResolveClientIdAsync(cancellationToken);
    }

    public async Task<Result<MessageThread>> EnsureThreadAccessAsync(
        Guid threadId,
        Guid userId,
        bool addParticipantIfMissing,
        CancellationToken cancellationToken = default)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<MessageThread>.Failure(clientIdResult.Errors);
        }

        MessageThread? thread = await _messageThreadRepository.FindByIdAsync(threadId, cancellationToken);
        if (thread is null)
        {
            return Result<MessageThread>.Failure(ThreadNotFoundError);
        }

        if (thread.ClientId != clientIdResult.Value)
        {
            return Result<MessageThread>.Failure(ThreadAccessDeniedError);
        }

        if (!thread.Participants.Contains(userId))
        {
            if (!addParticipantIfMissing)
            {
                return Result<MessageThread>.Failure(SenderNotParticipantError);
            }

            thread.AddParticipant(userId);
            _messageThreadRepository.Update(thread);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return Result<MessageThread>.Success(thread);
    }
}
