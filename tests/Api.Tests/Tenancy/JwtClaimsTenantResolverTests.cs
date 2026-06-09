using Api.Tenancy;
using Application.Abstractions;
using Microsoft.AspNetCore.Http;
using Moq;
using System.Security.Claims;

namespace Api.Tests.Tenancy;

public sealed class JwtClaimsTenantResolverTests
{
    [Fact]
    public async Task ResolveAsync_WhenNotAuthenticated_ReturnsNull()
    {
        Mock<ITenantPublicIdLookup> lookup = new();
        JwtClaimsTenantResolver resolver = new(lookup.Object);
        DefaultHttpContext httpContext = new();
        httpContext.User = new ClaimsPrincipal(new ClaimsIdentity());

        TenantId? result = await resolver.ResolveAsync(httpContext, CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task ResolveAsync_WhenAuthenticatedWithTenantSlug_ReturnsSlug()
    {
        Mock<ITenantPublicIdLookup> lookup = new();
        JwtClaimsTenantResolver resolver = new(lookup.Object);
        DefaultHttpContext httpContext = new();
        ClaimsIdentity identity = new([new Claim("tenantSlug", "acme-corp")], authenticationType: "Bearer");
        httpContext.User = new ClaimsPrincipal(identity);

        TenantId? result = await resolver.ResolveAsync(httpContext, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("acme-corp", result.Value.Value);
    }

    [Fact]
    public async Task ResolveAsync_WhenAuthenticatedWithTenantIdClaim_ResolvesSlugFromLookup()
    {
        Guid tenantId = Guid.Parse("019decf6-f9b3-7bf0-9d2f-44b94c79d5a8");
        Mock<ITenantPublicIdLookup> lookup = new();
        lookup
            .Setup(service => service.ResolveSlugByPublicIdAsync(tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync("acme-consulting");

        JwtClaimsTenantResolver resolver = new(lookup.Object);
        DefaultHttpContext httpContext = new();
        ClaimsIdentity identity = new(
            [new Claim("tenantId", tenantId.ToString())],
            authenticationType: "Bearer");
        httpContext.User = new ClaimsPrincipal(identity);

        TenantId? result = await resolver.ResolveAsync(httpContext, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("acme-consulting", result.Value.Value);
    }

    [Fact]
    public async Task ResolveAsync_WhenAuthenticatedWithoutTenantClaims_ReturnsNull()
    {
        Mock<ITenantPublicIdLookup> lookup = new();
        JwtClaimsTenantResolver resolver = new(lookup.Object);
        DefaultHttpContext httpContext = new();
        ClaimsIdentity identity = new([], authenticationType: "Bearer");
        httpContext.User = new ClaimsPrincipal(identity);

        TenantId? result = await resolver.ResolveAsync(httpContext, CancellationToken.None);

        Assert.Null(result);
    }
}
