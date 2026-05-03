using Api.Tenancy;
using Application.Abstractions;
using Infrastructure.Tenancy;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Moq;

namespace Api.Tests.Tenancy;

public sealed class TenantKeyTenantResolverTests
{
    private static TenantKeyTenantResolver CreateResolver(
        ITenantKeyLookup lookup,
        TenantKeyOptions options)
    {
        return new TenantKeyTenantResolver(lookup, Options.Create(options));
    }

    [Fact]
    public async Task ResolveAsync_WhenDisabled_ReturnsNull()
    {
        Mock<ITenantKeyLookup> lookup = new();
        TenantKeyTenantResolver resolver = CreateResolver(
            lookup.Object,
            new TenantKeyOptions { Enabled = false, Pepper = "pepper", HeaderName = "X-Tenant-Key" });

        DefaultHttpContext httpContext = new();
        httpContext.Request.Headers["X-Tenant-Key"] = "abc";

        TenantId? result = await resolver.ResolveAsync(httpContext, CancellationToken.None);

        Assert.Null(result);
        lookup.Verify(
            l => l.ResolveSlugByTenantKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ResolveAsync_WhenPepperMissing_ReturnsNull()
    {
        Mock<ITenantKeyLookup> lookup = new();
        TenantKeyTenantResolver resolver = CreateResolver(
            lookup.Object,
            new TenantKeyOptions { Enabled = true, Pepper = "", HeaderName = "X-Tenant-Key" });

        DefaultHttpContext httpContext = new();
        httpContext.Request.Headers["X-Tenant-Key"] = "abc";

        TenantId? result = await resolver.ResolveAsync(httpContext, CancellationToken.None);

        Assert.Null(result);
        lookup.Verify(
            l => l.ResolveSlugByTenantKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ResolveAsync_WhenHeaderMissing_ReturnsNull()
    {
        Mock<ITenantKeyLookup> lookup = new();
        TenantKeyTenantResolver resolver = CreateResolver(
            lookup.Object,
            new TenantKeyOptions { Enabled = true, Pepper = "pepper", HeaderName = "X-Tenant-Key" });

        DefaultHttpContext httpContext = new();

        TenantId? result = await resolver.ResolveAsync(httpContext, CancellationToken.None);

        Assert.Null(result);
        lookup.Verify(
            l => l.ResolveSlugByTenantKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ResolveAsync_WhenLookupReturnsSlug_ReturnsTenantId()
    {
        Mock<ITenantKeyLookup> lookup = new();
        lookup
            .Setup(l => l.ResolveSlugByTenantKeyAsync("secret-key", It.IsAny<CancellationToken>()))
            .ReturnsAsync("acme");

        TenantKeyTenantResolver resolver = CreateResolver(
            lookup.Object,
            new TenantKeyOptions { Enabled = true, Pepper = "pepper", HeaderName = "X-Tenant-Key" });

        DefaultHttpContext httpContext = new();
        httpContext.Request.Headers["X-Tenant-Key"] = "secret-key";

        TenantId? result = await resolver.ResolveAsync(httpContext, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("acme", result.Value.Value);
    }

    [Fact]
    public async Task ResolveAsync_UsesCustomHeaderName()
    {
        Mock<ITenantKeyLookup> lookup = new();
        lookup
            .Setup(l => l.ResolveSlugByTenantKeyAsync("k", It.IsAny<CancellationToken>()))
            .ReturnsAsync("t1");

        TenantKeyTenantResolver resolver = CreateResolver(
            lookup.Object,
            new TenantKeyOptions { Enabled = true, Pepper = "pepper", HeaderName = "X-Custom-Tenant" });

        DefaultHttpContext httpContext = new();
        httpContext.Request.Headers["X-Custom-Tenant"] = "k";
        httpContext.Request.Headers["X-Tenant-Key"] = "ignored";

        TenantId? result = await resolver.ResolveAsync(httpContext, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("t1", result.Value.Value);
    }
}
