using Shared;

namespace Domain.Tests;

public sealed class TenantSlugGeneratorTests
{
    [Fact]
    public void FromCompanyName_normalizes_ascii_company_name()
    {
        string slug = TenantSlugGenerator.FromCompanyName("  Acme Consulting LLC  ");

        Assert.Equal("acme-consulting-llc", slug);
    }

    [Fact]
    public void FromCompanyName_filters_non_ascii_alphanumeric_to_hyphens()
    {
        string slug = TenantSlugGenerator.FromCompanyName("Test!!!Company");

        Assert.Equal("test-company", slug);
    }

    [Fact]
    public void WithNumericSuffix_appends_counter_within_max_length()
    {
        string slug = TenantSlugGenerator.WithNumericSuffix("acme", 42);

        Assert.Equal("acme-42", slug);
        Assert.True(slug.Length <= TenantSlugGenerator.MaxLength);
    }

    [Fact]
    public void FallbackSlug_is_prefixed_and_bounded()
    {
        string slug = TenantSlugGenerator.FallbackSlug();

        Assert.StartsWith("org-", slug);
        Assert.True(slug.Length <= TenantSlugGenerator.MaxLength);
    }
}
