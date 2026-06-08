using Api.Tenancy;
using Application.Abstractions;
using Infrastructure.Tenancy;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Moq;

namespace Api.Tests.Tenancy;

public sealed class PublicIdHeaderTenantResolverTests
{
    private static PublicIdHeaderTenantResolver CreateResolver(
        ITenantPublicIdLookup lookup,
        TenantPublicIdHeaderOptions options)
    {
        return new PublicIdHeaderTenantResolver(lookup, Options.Create(options));
    }

    [Fact]
    public async Task ResolveAsync_WhenDisabled_ReturnsNull()
    {
        Mock<ITenantPublicIdLookup> lookup = new();
        PublicIdHeaderTenantResolver resolver = CreateResolver(
            lookup.Object,
            new TenantPublicIdHeaderOptions { Enabled = false, HeaderName = "X-Tenant-Id" });

        Guid id = Guid.Parse("11111111-1111-1111-1111-111111111111");
        DefaultHttpContext httpContext = new();
        httpContext.Request.Headers["X-Tenant-Id"] = id.ToString();

        TenantId? result = await resolver.ResolveAsync(httpContext, CancellationToken.None);

        Assert.Null(result);
        lookup.Verify(
            l => l.ResolveSlugByPublicIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ResolveAsync_WhenHeaderMissing_ReturnsNull()
    {
        Mock<ITenantPublicIdLookup> lookup = new();
        PublicIdHeaderTenantResolver resolver = CreateResolver(
            lookup.Object,
            new TenantPublicIdHeaderOptions { Enabled = true, HeaderName = "X-Tenant-Id" });

        DefaultHttpContext httpContext = new();

        TenantId? result = await resolver.ResolveAsync(httpContext, CancellationToken.None);

        Assert.Null(result);
        lookup.Verify(
            l => l.ResolveSlugByPublicIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ResolveAsync_WhenHeaderNotGuid_ReturnsNull()
    {
        Mock<ITenantPublicIdLookup> lookup = new();
        PublicIdHeaderTenantResolver resolver = CreateResolver(
            lookup.Object,
            new TenantPublicIdHeaderOptions { Enabled = true, HeaderName = "X-Tenant-Id" });

        DefaultHttpContext httpContext = new();
        httpContext.Request.Headers["X-Tenant-Id"] = "not-a-guid";

        TenantId? result = await resolver.ResolveAsync(httpContext, CancellationToken.None);

        Assert.Null(result);
        lookup.Verify(
            l => l.ResolveSlugByPublicIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ResolveAsync_WhenLookupReturnsSlug_ReturnsTenantId()
    {
        Guid tenantId = Guid.Parse("22222222-2222-2222-2222-222222222222");

        Mock<ITenantPublicIdLookup> lookup = new();
        lookup
            .Setup(l => l.ResolveSlugByPublicIdAsync(tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync("acme");

        PublicIdHeaderTenantResolver resolver = CreateResolver(
            lookup.Object,
            new TenantPublicIdHeaderOptions { Enabled = true, HeaderName = "X-Tenant-Id" });

        DefaultHttpContext httpContext = new();
        httpContext.Request.Headers["X-Tenant-Id"] = tenantId.ToString();

        TenantId? result = await resolver.ResolveAsync(httpContext, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("acme", result.Value.Value);
    }

    [Fact]
    public async Task ResolveAsync_UsesCustomHeaderName()
    {
        Guid tenantId = Guid.Parse("33333333-3333-3333-3333-333333333333");

        Mock<ITenantPublicIdLookup> lookup = new();
        lookup
            .Setup(l => l.ResolveSlugByPublicIdAsync(tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync("t1");

        PublicIdHeaderTenantResolver resolver = CreateResolver(
            lookup.Object,
            new TenantPublicIdHeaderOptions { Enabled = true, HeaderName = "X-Custom-Tenant" });

        DefaultHttpContext httpContext = new();
        httpContext.Request.Headers["X-Custom-Tenant"] = tenantId.ToString();
        httpContext.Request.Headers["X-Tenant-Id"] = Guid.NewGuid().ToString();

        TenantId? result = await resolver.ResolveAsync(httpContext, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("t1", result.Value.Value);
    }
}
