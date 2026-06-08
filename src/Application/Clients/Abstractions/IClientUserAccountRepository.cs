using Domain;

namespace Application.Clients.Abstractions;

public interface IClientUserAccountRepository
{
    Task<bool> ExistsByEmailAsync(EmailAddress email, CancellationToken cancellationToken = default);

    Task<User?> FindByEmailAsync(EmailAddress email, CancellationToken cancellationToken = default);

    Task<User?> FindByIdAsync(Guid userId, CancellationToken cancellationToken = default);

    void Add(User user);

    void Update(User user);
}
