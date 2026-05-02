using Application.Auth.Abstractions;
using Application.Auth.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Auth;

public sealed class RegisterBusinessCommandHandler : IRequestHandler<RegisterBusinessCommand, Result<RegisterBusinessResultDto>>
{
    private static readonly Error TenantDomainTakenError = new(
        "Auth.TenantDomainTaken",
        "Tenant domain is already in use.",
        ErrorType.Conflict);

    private static readonly Error TenantSlugAllocationFailedError = new(
        "Auth.TenantSlugAllocationFailed",
        "Could not allocate a unique tenant slug. Try a slightly different company name.",
        ErrorType.Conflict);

    private readonly IBusinessRegistrationService _businessRegistrationService;
    private readonly IPasswordHasher _passwordHasher;

    public RegisterBusinessCommandHandler(
        IBusinessRegistrationService businessRegistrationService,
        IPasswordHasher passwordHasher)
    {
        _businessRegistrationService = businessRegistrationService;
        _passwordHasher = passwordHasher;
    }

    public async Task<Result<RegisterBusinessResultDto>> Handle(
        RegisterBusinessCommand request,
        CancellationToken cancellationToken)
    {
        if (await _businessRegistrationService.IsTenantDomainTakenAsync(request.CompanyDomain, cancellationToken))
        {
            return Result<RegisterBusinessResultDto>.Failure(TenantDomainTakenError);
        }

        string? resolvedSlug = await ResolveUniqueTenantSlugAsync(
            TenantSlugGenerator.FromCompanyName(request.CompanyName),
            cancellationToken);

        if (resolvedSlug is null)
        {
            return Result<RegisterBusinessResultDto>.Failure(TenantSlugAllocationFailedError);
        }

        Guid tenantId = Guid.CreateVersion7();
        Tenant tenant = Tenant.Create(
            id: tenantId,
            slug: resolvedSlug,
            name: request.CompanyName,
            domain: request.CompanyDomain,
            plan: request.Plan,
            settings: TenantSettings.Default(),
            isActive: true);

        Guid ownerUserId = Guid.CreateVersion7();
        User ownerUser = User.Create(
            id: ownerUserId,
            email: new EmailAddress(request.OwnerEmail),
            fullName: request.OwnerFullName,
            passwordHash: _passwordHasher.Hash(request.OwnerPassword),
            role: Role.Owner,
            isActive: true);

        await _businessRegistrationService.RegisterAsync(tenant, ownerUser, cancellationToken);

        RegisterBusinessResultDto result = new(
            TenantId: tenant.Id,
            OwnerUserId: ownerUser.Id,
            TenantSlug: tenant.Slug);

        return Result<RegisterBusinessResultDto>.Success(result);
    }

    private async Task<string?> ResolveUniqueTenantSlugAsync(
        string baseSlug,
        CancellationToken cancellationToken)
    {
        const int maxAttempts = 500;
        string candidate = baseSlug;

        for (int attempt = 0; attempt < maxAttempts; attempt++)
        {
            if (attempt > 0)
            {
                candidate = TenantSlugGenerator.WithNumericSuffix(baseSlug, attempt + 1);
            }

            if (!await _businessRegistrationService.IsTenantSlugTakenAsync(candidate, cancellationToken))
            {
                return candidate;
            }
        }

        return null;
    }
}
