namespace Application.Clients.Dtos;

public sealed record ClientAttentionItemDto(
    string Code,
    string Title,
    string Description,
    string Severity);
