using Domain;

namespace Application.Auth.Abstractions;

public interface IBusinessRegistrationService
{
    Task<bool> IsTenantSlugTakenAsync(string slug, CancellationToken cancellationToken = default);

    Task<bool> IsTenantDomainTakenAsync(string domain, CancellationToken cancellationToken = default);

    /// <returns>Plaintext tenant API key when <c>Tenancy:TenantKey:Pepper</c> is configured; otherwise null.</returns>
    Task<string?> RegisterAsync(Tenant tenant, User ownerUser, CancellationToken cancellationToken = default);
}
