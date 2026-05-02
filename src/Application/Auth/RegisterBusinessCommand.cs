using Application.Abstractions;
using Application.Auth.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Auth;

public sealed record RegisterBusinessCommand(
    string CompanyName,
    string CompanyDomain,
    string OwnerFullName,
    string OwnerEmail,
    string OwnerPassword,
    Plan Plan = Plan.Starter)
    : IRequest<Result<RegisterBusinessResultDto>>, ITenantOptionalRequest;
