namespace Infrastructure.Team;

public sealed class StaffInvitationLinkFactoryOptions
{
    public const string SectionName = "StaffInvitations";

    public string AcceptInvitationBaseUrl { get; set; } = "http://localhost:4200/auth/accept-staff-invitation";
}
