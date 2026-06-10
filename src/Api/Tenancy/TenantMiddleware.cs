using Api.Contracts;
using Application.Abstractions;
using Domain;

namespace Api.Tenancy;

public sealed class TenantMiddleware : IMiddleware
{
    private readonly IEnumerable<ITenantResolver> _tenantResolvers;
    private readonly ITenantPublicRecordLookup _tenantPublicRecordLookup;
    private readonly ILogger<TenantMiddleware> _logger;

    public TenantMiddleware(
        IEnumerable<ITenantResolver> tenantResolvers,
        ITenantPublicRecordLookup tenantPublicRecordLookup,
        ILogger<TenantMiddleware> logger)
    {
        _tenantResolvers = tenantResolvers;
        _tenantPublicRecordLookup = tenantPublicRecordLookup;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(next);

        TenantId? resolvedTenant = null;
        foreach (ITenantResolver tenantResolver in _tenantResolvers)
        {
            resolvedTenant = await tenantResolver.ResolveAsync(context, context.RequestAborted);
            if (resolvedTenant is not null)
            {
                break;
            }
        }

        if (resolvedTenant is not null)
        {
            string slug = resolvedTenant.Value.Value;
            context.Items[TenantHttpContextKeys.TenantId] = slug;
            context.Items[TenantHttpContextKeys.TenantSlug] = slug;

            TenantPublicRecord? tenantRecord = await _tenantPublicRecordLookup.FindBySlugAsync(
                slug,
                context.RequestAborted);

            context.Items[TenantHttpContextKeys.TenantSettings] = tenantRecord?.Settings ?? TenantSettings.Default();
            if (tenantRecord is not null)
            {
                context.Items[TenantHttpContextKeys.TenantPublicId] = tenantRecord.Id;
            }

            await next(context);
            return;
        }

        if (!IsTenantRequired(context))
        {
            await next(context);
            return;
        }

        _logger.LogWarning(
            "Tenant resolution failed for required route. Host: {Host}, Path: {Path}",
            context.Request.Host.Host,
            context.Request.Path.Value);

        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await context.Response.WriteAsJsonAsync(
            ApiResponse<object>.Fail(
            [
                new ApiError(
                    Code: "Tenant.Unresolved",
                    Message: "Tenant could not be resolved for this request (host, domain, API key, or tenant header).",
                    Type: "validation")
            ]));
    }

    private static bool IsTenantRequired(HttpContext context)
    {
        Endpoint? endpoint = context.GetEndpoint();
        return endpoint?.Metadata.GetMetadata<RequireTenantAttribute>() is not null;
    }
}
