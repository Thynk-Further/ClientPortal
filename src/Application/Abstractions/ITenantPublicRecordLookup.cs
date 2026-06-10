using Domain;

namespace Application.Abstractions;

public sealed record TenantPublicRecord(
    Guid Id,
    string Slug,
    string Name,
    string Domain,
    Plan Plan,
    TenantSettings Settings,
    bool IsActive);

public interface ITenantPublicRecordLookup
{
    Task<TenantPublicRecord?> FindBySlugAsync(string slug, CancellationToken cancellationToken = default);

    Task<TenantPublicRecord?> FindByDomainAsync(string domain, CancellationToken cancellationToken = default);
}
