namespace Application.Clients.Dtos;

public sealed record ClientWorkspaceDto(
    ClientDetailDto Client,
    OnboardingStatusDto? Onboarding,
    ClientWorkspaceMetricsDto Metrics,
    IReadOnlyList<ClientAttentionItemDto> AttentionItems,
    IReadOnlyList<ClientActivityItemDto> RecentActivity);
