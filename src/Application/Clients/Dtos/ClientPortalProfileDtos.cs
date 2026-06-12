namespace Application.Clients.Dtos;

public sealed record ClientPortalProfileDto(
    string CompanyName,
    string ContactName,
    string Email,
    string Phone);
