using Shared;

namespace Domain;

public sealed class OnboardingChecklist : AggregateRoot<Guid>
{
    private List<string> _configuredStepKeys = [];
    private List<string> _completedStepKeys = [];

    public Guid ClientId { get; private set; }

    public Guid TenantId { get; private set; }

    public IReadOnlyCollection<string> ConfiguredStepKeys => _configuredStepKeys.AsReadOnly();

    public IReadOnlyCollection<string> CompletedStepKeys => _completedStepKeys.AsReadOnly();

    private OnboardingChecklist()
    {
    }

    private OnboardingChecklist(
        Guid id,
        Guid clientId,
        Guid tenantId,
        IEnumerable<string> configuredStepKeys,
        IEnumerable<string>? completedStepKeys = null)
        : base(id)
    {
        ClientId = clientId;
        TenantId = tenantId;
        SetConfiguredSteps(configuredStepKeys);

        if (completedStepKeys is not null)
        {
            foreach (string stepKey in completedStepKeys)
            {
                CompleteStep(stepKey);
            }
        }
    }

    public static OnboardingChecklist Create(
        Guid id,
        Guid clientId,
        Guid tenantId,
        IEnumerable<string> configuredStepKeys)
    {
        return new OnboardingChecklist(id, clientId, tenantId, configuredStepKeys);
    }

    public static OnboardingChecklist CreateDefault(Guid clientId, Guid tenantId)
    {
        return new OnboardingChecklist(
            Guid.CreateVersion7(),
            clientId,
            tenantId,
            ["profile", "billing", "first-project"]);
    }

    public void SetConfiguredSteps(IEnumerable<string> configuredStepKeys)
    {
        ArgumentNullException.ThrowIfNull(configuredStepKeys);
        _configuredStepKeys.Clear();
        _completedStepKeys.Clear();

        foreach (string stepKey in configuredStepKeys)
        {
            string normalized = NormalizeStepKey(stepKey);
            if (_configuredStepKeys.Contains(normalized, StringComparer.Ordinal))
            {
                continue;
            }

            _configuredStepKeys.Add(normalized);
        }

        if (_configuredStepKeys.Count == 0)
        {
            throw new ArgumentException("At least one onboarding step must be configured.", nameof(configuredStepKeys));
        }

        MarkUpdated();
    }

    public void CompleteStep(string stepKey)
    {
        string normalized = NormalizeStepKey(stepKey);
        if (!_configuredStepKeys.Contains(normalized, StringComparer.Ordinal))
        {
            throw new ArgumentException("Step is not configured for this tenant.", nameof(stepKey));
        }

        if (_completedStepKeys.Contains(normalized, StringComparer.Ordinal))
        {
            return;
        }

        _completedStepKeys.Add(normalized);
        MarkUpdated();
    }

    private static string NormalizeStepKey(string stepKey)
    {
        return Guard.NotEmpty(stepKey, nameof(stepKey)).Trim().ToLowerInvariant();
    }
}
