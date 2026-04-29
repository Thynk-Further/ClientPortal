using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record GetOnboardingStatusQuery(Guid ClientId) : IRequest<Result<OnboardingStatusDto>>;
