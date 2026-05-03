namespace Application.Auth.Dtos;

public sealed record RegisterBusinessResultDto(
    Guid TenantId,
    Guid OwnerUserId,
    string TenantSlug,
    string? TenantKey);
