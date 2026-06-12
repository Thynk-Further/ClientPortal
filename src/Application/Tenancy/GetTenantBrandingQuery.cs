using Application.Abstractions;
using Application.Tenancy.Dtos;
using MediatR;
using Shared;

namespace Application.Tenancy;

public sealed record GetTenantBrandingQuery : IRequest<Result<TenantBrandingDto>>, ITenantOptionalRequest;
