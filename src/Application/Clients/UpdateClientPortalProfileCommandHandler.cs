using Application.Abstractions;
using Application.Auth.Abstractions;
using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class UpdateClientPortalProfileCommandHandler
    : IRequestHandler<UpdateClientPortalProfileCommand, Result<ClientPortalProfileDto>>
{
    private static readonly Error ClientNotFoundError = new(
        "Clients.NotFound",
        "Client was not found.",
        ErrorType.NotFound);

    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly ICurrentUser _currentUser;
    private readonly IClientRepository _clientRepository;
    private readonly IUserAuthenticationRepository _userAuthenticationRepository;
    private readonly IClientPortalProfileReader _profileReader;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateClientPortalProfileCommandHandler(
        ICurrentClientResolver currentClientResolver,
        ICurrentUser currentUser,
        IClientRepository clientRepository,
        IUserAuthenticationRepository userAuthenticationRepository,
        IClientPortalProfileReader profileReader,
        IUnitOfWork unitOfWork)
    {
        _currentClientResolver = currentClientResolver;
        _currentUser = currentUser;
        _clientRepository = clientRepository;
        _userAuthenticationRepository = userAuthenticationRepository;
        _profileReader = profileReader;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<ClientPortalProfileDto>> Handle(
        UpdateClientPortalProfileCommand request,
        CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is null)
        {
            return Result<ClientPortalProfileDto>.Failure(new Error(
                "Auth.InvalidUserContext",
                "Authenticated user context is invalid.",
                ErrorType.Forbidden));
        }

        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<ClientPortalProfileDto>.Failure(clientIdResult.Errors);
        }

        Client? client = await _clientRepository.FindByIdAsync(clientIdResult.Value, cancellationToken);
        if (client is null)
        {
            return Result<ClientPortalProfileDto>.Failure(ClientNotFoundError);
        }

        User? user = await _userAuthenticationRepository.FindByIdAsync(
            _currentUser.UserId.Value,
            cancellationToken);
        if (user is null)
        {
            return Result<ClientPortalProfileDto>.Failure(new Error(
                "Auth.UserNotFound",
                "Authenticated user was not found.",
                ErrorType.Forbidden));
        }

        client.UpdateProfile(
            client.CompanyName,
            request.ContactName,
            client.Email,
            new PhoneNumber(request.Phone));
        user.UpdateProfile(request.ContactName);

        _clientRepository.Update(client);
        _userAuthenticationRepository.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        ClientPortalProfileDto profile = await _profileReader.GetProfileAsync(
            clientIdResult.Value,
            cancellationToken);

        return Result<ClientPortalProfileDto>.Success(profile);
    }
}
