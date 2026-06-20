using Domain;

namespace Application.Abstractions;

public interface IPublicTenantRepository
{
    Task<PublicTenantRecord?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);

    Task UpdateSettingsAsync(Guid tenantId, TenantSettings settings, CancellationToken cancellationToken = default);
}

public sealed record PublicTenantRecord(
    Guid Id,
    string Slug,
    string Name,
    string Domain,
    Plan Plan,
    TenantSettings Settings,
    bool IsActive);
