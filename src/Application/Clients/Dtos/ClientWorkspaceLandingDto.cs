namespace Application.Clients.Dtos;

public sealed record ClientWorkspaceLandingDto(
    int TotalClients,
    IReadOnlyList<ClientListItemDto> RecentClients,
    IReadOnlyList<ClientListItemDto> PendingInvites);
