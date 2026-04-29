using MediatR;
using Shared;

namespace Application.Clients;

public sealed record CompleteOnboardingStepCommand(
    Guid ClientId,
    string StepKey) : IRequest<Result>;
