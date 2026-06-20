using Application.Abstractions;
using Application.Tenancy.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Tenancy;

public sealed class GetTenantSettingsQueryHandler : IRequestHandler<GetTenantSettingsQuery, Result<TenantSettingsDto>>
{
    private static readonly Error TenantNotResolvedError = new(
        "Tenant.Unresolved",
        "Tenant could not be resolved.",
        ErrorType.NotFound);

    private readonly ICurrentTenant _currentTenant;
    private readonly IPublicTenantRepository _publicTenantRepository;

    public GetTenantSettingsQueryHandler(
        ICurrentTenant currentTenant,
        IPublicTenantRepository publicTenantRepository)
    {
        _currentTenant = currentTenant;
        _publicTenantRepository = publicTenantRepository;
    }

    public async Task<Result<TenantSettingsDto>> Handle(
        GetTenantSettingsQuery request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_currentTenant.Slug))
        {
            return Result<TenantSettingsDto>.Failure(TenantNotResolvedError);
        }

        PublicTenantRecord? tenant = await _publicTenantRepository.GetBySlugAsync(
            _currentTenant.Slug,
            cancellationToken);

        if (tenant is null || !tenant.IsActive)
        {
            return Result<TenantSettingsDto>.Failure(TenantNotResolvedError);
        }

        TenantSettingsDto dto = TenantSettingsMapping.Map(tenant);
        return Result<TenantSettingsDto>.Success(dto);
    }
}
