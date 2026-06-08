using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;

namespace Api.Middleware;

/// <summary>Bypasses fallback auth for /openapi and /scalar (Scalar nested routes do not all inherit AllowAnonymous).</summary>
internal sealed class DocsAnonymousAuthorizationMiddlewareResultHandler : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler _defaultHandler = new();

    public Task HandleAsync(
        RequestDelegate next,
        HttpContext context,
        AuthorizationPolicy policy,
        PolicyAuthorizationResult authorizeResult)
    {
        if (!authorizeResult.Succeeded && IsDocumentationPath(context.Request.Path))
        {
            return next(context);
        }

        return _defaultHandler.HandleAsync(next, context, policy, authorizeResult);
    }

    private static bool IsDocumentationPath(PathString path) =>
        path.StartsWithSegments("/openapi") || path.StartsWithSegments("/scalar");
}
