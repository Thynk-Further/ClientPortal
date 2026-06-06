using Application.Abstractions;
using Application.Clients.Abstractions;
using Microsoft.Extensions.Options;

namespace Infrastructure.Clients;

public sealed class ClientInvitationLinkFactory : IClientInvitationLinkFactory
{
    private readonly ClientInvitationLinkFactoryOptions _options;
    private readonly ICurrentTenant _currentTenant;

    public ClientInvitationLinkFactory(
        IOptions<ClientInvitationLinkFactoryOptions> options,
        ICurrentTenant currentTenant)
    {
        _options = options.Value;
        _currentTenant = currentTenant;
    }

    public string CreateAcceptInvitationLink(string inviteToken)
    {
        string normalizedToken = string.IsNullOrWhiteSpace(inviteToken)
            ? throw new ArgumentException("Invite token cannot be empty.", nameof(inviteToken))
            : inviteToken.Trim();

        string tenantSlug = string.IsNullOrWhiteSpace(_currentTenant.Slug)
            ? throw new InvalidOperationException("Tenant slug must be resolved to build a client invitation link.")
            : _currentTenant.Slug.Trim();

        string baseUrl = string.IsNullOrWhiteSpace(_options.AcceptInvitationBaseUrl)
            ? throw new InvalidOperationException("ClientInvitations:AcceptInvitationBaseUrl must be configured.")
            : _options.AcceptInvitationBaseUrl.Trim();

        string separator = baseUrl.Contains('?', StringComparison.Ordinal) ? "&" : "?";
        return
            $"{baseUrl}{separator}token={Uri.EscapeDataString(normalizedToken)}&tenant={Uri.EscapeDataString(tenantSlug)}";
    }
}
