using Api.Tenancy;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace Api.Tests.Tenancy;

public sealed class JwtClaimsTenantResolverTests
{
    [Fact]
    public async Task ResolveAsync_WhenNotAuthenticated_ReturnsNull()
    {
        JwtClaimsTenantResolver resolver = new();
        DefaultHttpContext httpContext = new();
        httpContext.User = new ClaimsPrincipal(new ClaimsIdentity());

        TenantId? result = await resolver.ResolveAsync(httpContext, CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task ResolveAsync_WhenAuthenticatedWithTenantSlug_ReturnsSlug()
    {
        JwtClaimsTenantResolver resolver = new();
        DefaultHttpContext httpContext = new();
        ClaimsIdentity identity = new([new Claim("tenantSlug", "acme-corp")], authenticationType: "Bearer");
        httpContext.User = new ClaimsPrincipal(identity);

        TenantId? result = await resolver.ResolveAsync(httpContext, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("acme-corp", result.Value.Value);
    }

    [Fact]
    public async Task ResolveAsync_WhenAuthenticatedWithoutTenantSlug_ReturnsNull()
    {
        JwtClaimsTenantResolver resolver = new();
        DefaultHttpContext httpContext = new();
        ClaimsIdentity identity = new([], authenticationType: "Bearer");
        httpContext.User = new ClaimsPrincipal(identity);

        TenantId? result = await resolver.ResolveAsync(httpContext, CancellationToken.None);

        Assert.Null(result);
    }
}
