using Application.Abstractions;
using Application.Tenancy.Abstractions;
using Application.Tenancy.Dtos;
using MediatR;
using Shared;

namespace Application.Tenancy;

public sealed class GetTenantLogoUploadUrlCommandHandler
    : IRequestHandler<GetTenantLogoUploadUrlCommand, Result<TenantLogoUploadUrlResultDto>>
{
    private static readonly Error TenantNotResolvedError = new(
        "Tenant.Unresolved",
        "Tenant could not be resolved.",
        ErrorType.NotFound);

    private readonly ICurrentTenant _currentTenant;
    private readonly IPublicTenantRepository _publicTenantRepository;
    private readonly ITenantBrandingUploadUrlService _uploadUrlService;

    public GetTenantLogoUploadUrlCommandHandler(
        ICurrentTenant currentTenant,
        IPublicTenantRepository publicTenantRepository,
        ITenantBrandingUploadUrlService uploadUrlService)
    {
        _currentTenant = currentTenant;
        _publicTenantRepository = publicTenantRepository;
        _uploadUrlService = uploadUrlService;
    }

    public async Task<Result<TenantLogoUploadUrlResultDto>> Handle(
        GetTenantLogoUploadUrlCommand request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_currentTenant.Slug))
        {
            return Result<TenantLogoUploadUrlResultDto>.Failure(TenantNotResolvedError);
        }

        PublicTenantRecord? tenant = await _publicTenantRepository.GetBySlugAsync(
            _currentTenant.Slug,
            cancellationToken);

        if (tenant is null || !tenant.IsActive)
        {
            return Result<TenantLogoUploadUrlResultDto>.Failure(TenantNotResolvedError);
        }

        TenantBrandingUploadUrlIssueResult uploadResult = await _uploadUrlService.IssueLogoUploadUrlAsync(
            new TenantBrandingUploadUrlRequest(
                tenant.Id,
                request.FileName,
                request.ContentType),
            cancellationToken);

        TenantLogoUploadUrlResultDto result = new(
            uploadResult.UploadUrl,
            uploadResult.LogoUrl,
            uploadResult.ExpiresAtUtc);

        return Result<TenantLogoUploadUrlResultDto>.Success(result);
    }
}
