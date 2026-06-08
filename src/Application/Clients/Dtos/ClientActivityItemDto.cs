namespace Application.Clients.Dtos;

public sealed record ClientActivityItemDto(
    string Type,
    string Title,
    string Description,
    DateTime OccurredAt);
