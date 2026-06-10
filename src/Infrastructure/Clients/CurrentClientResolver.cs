using Application.Abstractions;
using Application.Auth.Abstractions;
using Application.Clients.Abstractions;
using Domain;
using Shared;

namespace Infrastructure.Clients;

public sealed class CurrentClientResolver : ICurrentClientResolver
{
    private readonly ICurrentUser _currentUser;
    private readonly IUserAuthenticationRepository _userAuthenticationRepository;
    private readonly IClientRepository _clientRepository;

    public CurrentClientResolver(
        ICurrentUser currentUser,
        IUserAuthenticationRepository userAuthenticationRepository,
        IClientRepository clientRepository)
    {
        _currentUser = currentUser;
        _userAuthenticationRepository = userAuthenticationRepository;
        _clientRepository = clientRepository;
    }

    public async Task<Result<Guid>> ResolveClientIdAsync(CancellationToken cancellationToken = default)
    {
        if (_currentUser.UserId is null)
        {
            return Result<Guid>.Failure(new Error(
                "Auth.InvalidUserContext",
                "Authenticated user context is invalid.",
                ErrorType.Forbidden));
        }

        User? user = await _userAuthenticationRepository.FindByIdAsync(
            _currentUser.UserId.Value,
            cancellationToken);
        if (user is null)
        {
            return Result<Guid>.Failure(new Error(
                "Auth.UserNotFound",
                "Authenticated user was not found.",
                ErrorType.Forbidden));
        }

        Client? client = await _clientRepository.GetByEmailAsync(user.Email, cancellationToken);
        if (client is null)
        {
            return Result<Guid>.Failure(new Error(
                "Clients.NotFound",
                "Client record for the authenticated user was not found.",
                ErrorType.NotFound));
        }

        return Result<Guid>.Success(client.Id);
    }
}
