using Application.Abstractions;
using Application.Auth.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class ChangeClientPortalPasswordCommandHandler
    : IRequestHandler<ChangeClientPortalPasswordCommand, Result>
{
    private static readonly Error InvalidCurrentPasswordError = new(
        "Auth.InvalidCurrentPassword",
        "Current password is incorrect.",
        ErrorType.Forbidden);

    private readonly ICurrentUser _currentUser;
    private readonly IUserAuthenticationRepository _userAuthenticationRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IUnitOfWork _unitOfWork;

    public ChangeClientPortalPasswordCommandHandler(
        ICurrentUser currentUser,
        IUserAuthenticationRepository userAuthenticationRepository,
        IPasswordHasher passwordHasher,
        IUnitOfWork unitOfWork)
    {
        _currentUser = currentUser;
        _userAuthenticationRepository = userAuthenticationRepository;
        _passwordHasher = passwordHasher;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(
        ChangeClientPortalPasswordCommand request,
        CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is null)
        {
            return Result.Failure(new Error(
                "Auth.InvalidUserContext",
                "Authenticated user context is invalid.",
                ErrorType.Forbidden));
        }

        User? user = await _userAuthenticationRepository.FindByIdAsync(
            _currentUser.UserId.Value,
            cancellationToken);
        if (user is null || !user.IsActive)
        {
            return Result.Failure(new Error(
                "Auth.UserNotFound",
                "Authenticated user was not found.",
                ErrorType.Forbidden));
        }

        if (!_passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
        {
            return Result.Failure(InvalidCurrentPasswordError);
        }

        user.UpdatePasswordHash(_passwordHasher.Hash(request.NewPassword));
        _userAuthenticationRepository.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
