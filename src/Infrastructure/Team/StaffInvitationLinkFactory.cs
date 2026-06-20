using Application.Team.Abstractions;
using Microsoft.Extensions.Options;

namespace Infrastructure.Team;

public sealed class StaffInvitationLinkFactory : IStaffInvitationLinkFactory
{
    private readonly StaffInvitationLinkFactoryOptions _options;

    public StaffInvitationLinkFactory(IOptions<StaffInvitationLinkFactoryOptions> options)
    {
        _options = options.Value;
    }

    public string CreateAcceptInvitationLink(string inviteToken, string tenantSlug)
    {
        if (string.IsNullOrWhiteSpace(inviteToken))
        {
            throw new ArgumentException("Invite token cannot be empty.", nameof(inviteToken));
        }

        if (string.IsNullOrWhiteSpace(tenantSlug))
        {
            throw new ArgumentException("Tenant slug cannot be empty.", nameof(tenantSlug));
        }

        string baseUrl = string.IsNullOrWhiteSpace(_options.AcceptInvitationBaseUrl)
            ? throw new InvalidOperationException("StaffInvitations:AcceptInvitationBaseUrl must be configured.")
            : _options.AcceptInvitationBaseUrl.Trim().TrimEnd('/');

        string encodedToken = Uri.EscapeDataString(inviteToken.Trim());
        string encodedSlug = Uri.EscapeDataString(tenantSlug.Trim().ToLowerInvariant());
        return $"{baseUrl}?token={encodedToken}&tenant={encodedSlug}";
    }
}
