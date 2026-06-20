using Application.Tenancy.Dtos;
using MediatR;
using Shared;

namespace Application.Tenancy;

public sealed record GetTenantLogoUploadUrlCommand(
    string FileName,
    string ContentType) : IRequest<Result<TenantLogoUploadUrlResultDto>>;
