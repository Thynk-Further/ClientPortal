using Application.Tenancy.Dtos;
using MediatR;
using Shared;

namespace Application.Tenancy;

public sealed record GetTenantSettingsQuery : IRequest<Result<TenantSettingsDto>>;
