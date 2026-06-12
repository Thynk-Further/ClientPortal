using Api.Contracts;
using Application.Tenancy;
using Application.Tenancy.Dtos;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Shared;

namespace Api.Tenancy;

public static class TenancyEndpoints
{
    public static IEndpointRouteBuilder MapTenancyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        RouteGroupBuilder group = endpoints.MapGroup("/api/v1/public/tenant")
            .WithTags("Tenancy")
            .AllowAnonymous();

        group.MapGet("/branding", GetTenantBrandingAsync)
            .WithName("PublicTenantBranding");

        return endpoints;
    }

    private static async Task<IResult> GetTenantBrandingAsync(
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<TenantBrandingDto> result = await sender.Send(new GetTenantBrandingQuery(), cancellationToken);
        return ToResponse(result);
    }

    private static IResult ToResponse<T>(Result<T> result)
    {
        if (result.IsSuccess && result.Value is not null)
        {
            return Results.Ok(ApiResponse<T>.Ok(result.Value));
        }

        ApiError[] apiErrors = result.Errors
            .Select(error => new ApiError(error.Code, error.Message, error.Type.ToString()))
            .ToArray();

        int statusCode = result.Errors.FirstOrDefault()?.Type switch
        {
            ErrorType.NotFound => StatusCodes.Status404NotFound,
            ErrorType.Validation => StatusCodes.Status400BadRequest,
            ErrorType.Forbidden => StatusCodes.Status403Forbidden,
            _ => StatusCodes.Status404NotFound
        };

        return Results.Json(ApiResponse<object?>.Fail(apiErrors), statusCode: statusCode);
    }
}
