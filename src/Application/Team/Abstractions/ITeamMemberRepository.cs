using Domain;

namespace Application.Team.Abstractions;

public interface ITeamMemberRepository
{
    Task<IReadOnlyList<User>> ListStaffAsync(CancellationToken cancellationToken = default);

    Task<int> CountActiveStaffAsync(CancellationToken cancellationToken = default);

    Task<int> CountActiveOwnersAsync(CancellationToken cancellationToken = default);

    Task<User?> FindStaffByIdAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<bool> ExistsByEmailAsync(EmailAddress email, CancellationToken cancellationToken = default);

    void Add(User user);

    void Update(User user);
}
