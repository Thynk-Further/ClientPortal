using Application.Tenancy.Dtos;
using MediatR;
using Shared;

namespace Application.Tenancy;

public sealed record UpdateTenantBrandingCommand(
    string BrandColour,
    string? LogoUrl) : IRequest<Result<TenantBrandingUpdateResultDto>>;
