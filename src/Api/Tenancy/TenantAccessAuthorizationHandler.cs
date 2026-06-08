using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;

namespace Api.Tenancy;

public sealed class TenantAccessAuthorizationHandler : AuthorizationHandler<TenantAccessRequirement>
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public TenantAccessAuthorizationHandler(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        TenantAccessRequirement requirement)
    {
        string? userTenantSlug = context.User.FindFirst("tenantSlug")?.Value;
        if (string.IsNullOrWhiteSpace(userTenantSlug))
        {
            return Task.CompletedTask;
        }

        HttpContext? httpContext = context.Resource as HttpContext ?? _httpContextAccessor.HttpContext;
        if (httpContext is null)
        {
            return Task.CompletedTask;
        }

        object? resourceTenantSlug = httpContext.Items[TenantHttpContextKeys.TenantSlug];
        string? resolvedSlug = resourceTenantSlug as string;
        if (string.IsNullOrWhiteSpace(resolvedSlug))
        {
            return Task.CompletedTask;
        }

        if (string.Equals(userTenantSlug, resolvedSlug, StringComparison.Ordinal))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
