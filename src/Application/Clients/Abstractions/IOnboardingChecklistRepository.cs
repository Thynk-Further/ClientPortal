using Domain;

namespace Application.Clients.Abstractions;

public interface IOnboardingChecklistRepository
{
    Task<OnboardingChecklist?> FindByClientIdAsync(Guid clientId, CancellationToken cancellationToken = default);

    void Add(OnboardingChecklist checklist);

    void Update(OnboardingChecklist checklist);
}
