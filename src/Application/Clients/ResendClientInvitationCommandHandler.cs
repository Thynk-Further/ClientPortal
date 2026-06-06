using Application.Abstractions;
using Application.Auth.Abstractions;
using Application.Clients.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class ResendClientInvitationCommandHandler : IRequestHandler<ResendClientInvitationCommand, Result>
{
    private static readonly Error ClientNotFoundError = new(
        "Clients.NotFound",
        "Client was not found.",
        ErrorType.NotFound);

    private static readonly Error ClientAlreadyActiveError = new(
        "Clients.AlreadyActive",
        "This client has already accepted their invitation.",
        ErrorType.Conflict);

    private static readonly Error ClientUserNotFoundError = new(
        "Clients.UserNotFound",
        "Client user account was not found.",
        ErrorType.NotFound);

    private readonly IClientRepository _clientRepository;
    private readonly IClientUserAccountRepository _clientUserAccountRepository;
    private readonly IClientInvitationTokenService _clientInvitationTokenService;
    private readonly IClientInvitationTokenStore _clientInvitationTokenStore;
    private readonly IUnitOfWork _unitOfWork;

    public ResendClientInvitationCommandHandler(
        IClientRepository clientRepository,
        IClientUserAccountRepository clientUserAccountRepository,
        IClientInvitationTokenService clientInvitationTokenService,
        IClientInvitationTokenStore clientInvitationTokenStore,
        IUnitOfWork unitOfWork)
    {
        _clientRepository = clientRepository;
        _clientUserAccountRepository = clientUserAccountRepository;
        _clientInvitationTokenService = clientInvitationTokenService;
        _clientInvitationTokenStore = clientInvitationTokenStore;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(ResendClientInvitationCommand request, CancellationToken cancellationToken)
    {
        Client? client = await _clientRepository.FindByIdAsync(request.ClientId, cancellationToken);
        if (client is null)
        {
            return Result.Failure(ClientNotFoundError);
        }

        if (client.Status != ClientStatus.Invited)
        {
            return Result.Failure(ClientAlreadyActiveError);
        }

        User? clientUser = await _clientUserAccountRepository.FindByEmailAsync(client.Email, cancellationToken);
        if (clientUser is null)
        {
            return Result.Failure(ClientUserNotFoundError);
        }

        if (clientUser.IsActive)
        {
            return Result.Failure(ClientAlreadyActiveError);
        }

        ClientInvitationTokenIssueResult inviteToken = _clientInvitationTokenService.Issue();

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            await _clientInvitationTokenStore.InvalidateActiveForUserAsync(
                client.Id,
                clientUser.Id,
                cancellationToken);

            await _clientInvitationTokenStore.StoreAsync(
                client.Id,
                clientUser.Id,
                inviteToken.TokenHash,
                inviteToken.ExpiresAtUtc,
                cancellationToken);

            client.RaiseInvitedEvent(
                clientUser.Id,
                client.Email.Value,
                client.ContactName,
                inviteToken.Token,
                DateTime.UtcNow);

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);
        }
        catch
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            throw;
        }

        return Result.Success();
    }
}
