namespace Application.Clients;

public sealed class ClientPortalPaymentOptions
{
    public const string SectionName = "ClientPortal:Payments";

    public string DefaultProvider { get; set; } = "peach";
}
