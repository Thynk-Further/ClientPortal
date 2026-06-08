namespace Infrastructure.Clients;

public sealed class ClientInvitationLinkFactoryOptions
{
    public const string SectionName = "ClientInvitations";

    public string AcceptInvitationBaseUrl { get; set; } = "http://localhost:4201/auth/accept-invitation";
}
