namespace Application.Team.Abstractions;

public interface IStaffInvitationLinkFactory
{
    string CreateAcceptInvitationLink(string inviteToken, string tenantSlug);
}
