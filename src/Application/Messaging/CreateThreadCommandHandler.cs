using Application.Clients.Abstractions;
using Application.Abstractions;
using Application.Messaging.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Messaging;

public sealed class CreateThreadCommandHandler : IRequestHandler<CreateThreadCommand, Result<Guid>>
{
    private static readonly Error ClientNotFoundError = new(
        "Messages.ClientNotFound",
        "Client was not found.",
        ErrorType.NotFound);

    private static readonly Error ClientPortalUserNotFoundError = new(
        "Messages.ClientPortalUserNotFound",
        "This client has not completed portal onboarding yet. Resend their invitation or wait until they accept before starting a chat.",
        ErrorType.Validation);

    private readonly IMessageThreadRepository _messageThreadRepository;
    private readonly IClientRepository _clientRepository;
    private readonly IClientUserAccountRepository _clientUserAccountRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateThreadCommandHandler(
        IMessageThreadRepository messageThreadRepository,
        IClientRepository clientRepository,
        IClientUserAccountRepository clientUserAccountRepository,
        IUnitOfWork unitOfWork)
    {
        _messageThreadRepository = messageThreadRepository;
        _clientRepository = clientRepository;
        _clientUserAccountRepository = clientUserAccountRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(CreateThreadCommand request, CancellationToken cancellationToken)
    {
        Client? client = await _clientRepository.FindByIdAsync(request.ClientId, cancellationToken);
        if (client is null)
        {
            return Result<Guid>.Failure(ClientNotFoundError);
        }

        HashSet<Guid> participants = request.ParticipantIds
            .Where(participantId => participantId != Guid.Empty)
            .ToHashSet();

        participants.Add(request.CreatorId);

        if (!await ContainsClientPortalParticipantAsync(participants, cancellationToken))
        {
            User? clientPortalUser = await _clientUserAccountRepository.FindByEmailAsync(
                client.Email,
                cancellationToken);

            if (clientPortalUser is null
                || (clientPortalUser.Role != Role.ClientUser && clientPortalUser.Role != Role.ClientAdmin))
            {
                return Result<Guid>.Failure(ClientPortalUserNotFoundError);
            }

            participants.Add(clientPortalUser.Id);
        }

        DateTime createdAt = DateTime.UtcNow;
        MessageThread thread = MessageThread.Create(
            id: Guid.CreateVersion7(),
            clientId: request.ClientId,
            projectId: request.ProjectId,
            participants: participants,
            subject: request.Subject,
            lastMessageAt: createdAt);

        _messageThreadRepository.Add(thread);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(thread.Id);
    }

    private async Task<bool> ContainsClientPortalParticipantAsync(
        IReadOnlyCollection<Guid> participantIds,
        CancellationToken cancellationToken)
    {
        foreach (Guid participantId in participantIds)
        {
            User? user = await _clientUserAccountRepository.FindByIdAsync(participantId, cancellationToken);
            if (user is not null && (user.Role == Role.ClientUser || user.Role == Role.ClientAdmin))
            {
                return true;
            }
        }

        return false;
    }
}
