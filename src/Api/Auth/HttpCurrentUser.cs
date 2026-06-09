using System.Security.Claims;
using Application.Abstractions;

namespace Api.Auth;

public sealed class HttpCurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpCurrentUser(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? UserId
    {
        get
        {
            ClaimsPrincipal? principal = _httpContextAccessor.HttpContext?.User;
            string? userIdClaim = principal?.FindFirstValue("userId");
            return Guid.TryParse(userIdClaim, out Guid userId) ? userId : null;
        }
    }

    public string? Role => _httpContextAccessor.HttpContext?.User?.FindFirstValue("role");

    public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated == true;
}
