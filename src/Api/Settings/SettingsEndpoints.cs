using Api.Auth;
using Api.Contracts;
using Api.Tenancy;
using Application.Tenancy;
using Application.Tenancy.Dtos;
using Application.Team;
using Application.Team.Dtos;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Shared;

namespace Api.Settings;

public static class SettingsEndpoints
{
    public static IEndpointRouteBuilder MapSettingsEndpoints(this IEndpointRouteBuilder endpoints)
    {
        RouteGroupBuilder group = endpoints.MapGroup("/api/v1/settings")
            .WithTags("Settings")
            .RequireTenant()
            .RequireAuthorization(AuthorizationPolicies.RequireOwnerOrAdmin);

        group.MapGet("/", GetSettingsAsync).WithName("SettingsGet");
        group.MapPut("/branding", UpdateBrandingAsync).WithName("SettingsUpdateBranding");
        group.MapPost("/branding/logo/upload-url", GetLogoUploadUrlAsync).WithName("SettingsGetLogoUploadUrl");
        group.MapPut("/tax", UpdateTaxAsync).WithName("SettingsUpdateTax");
        group.MapPut("/notifications", UpdateNotificationsAsync).WithName("SettingsUpdateNotifications");

        RouteGroupBuilder teamGroup = endpoints.MapGroup("/api/v1/settings/team")
            .WithTags("Settings")
            .RequireTenant()
            .RequireAuthorization(AuthorizationPolicies.RequireOwnerOrAdmin);

        teamGroup.MapGet("/", ListTeamMembersAsync).WithName("SettingsListTeamMembers");
        teamGroup.MapPost("/invite", InviteTeamMemberAsync).WithName("SettingsInviteTeamMember");
        teamGroup.MapPut("/{userId:guid}/role", UpdateTeamMemberRoleAsync).WithName("SettingsUpdateTeamMemberRole");
        teamGroup.MapDelete("/{userId:guid}", DeactivateTeamMemberAsync).WithName("SettingsDeactivateTeamMember");

        return endpoints;
    }

    private static async Task<IResult> GetSettingsAsync(ISender sender, CancellationToken cancellationToken)
    {
        Result<TenantSettingsDto> result = await sender.Send(new GetTenantSettingsQuery(), cancellationToken);
        return ToResponse(result);
    }

    private static async Task<IResult> UpdateBrandingAsync(
        UpdateTenantBrandingRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<TenantBrandingUpdateResultDto> result = await sender.Send(
            new UpdateTenantBrandingCommand(request.BrandColour, request.LogoUrl),
            cancellationToken);

        return ToResponse(result);
    }

    private static async Task<IResult> GetLogoUploadUrlAsync(
        GetTenantLogoUploadUrlRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<TenantLogoUploadUrlResultDto> result = await sender.Send(
            new GetTenantLogoUploadUrlCommand(request.FileName, request.ContentType),
            cancellationToken);

        return ToResponse(result);
    }

    private static async Task<IResult> UpdateTaxAsync(
        UpdateTenantTaxConfigRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<TenantTaxSettingsDto> result = await sender.Send(
            new UpdateTenantTaxConfigCommand(
                request.Label,
                request.TaxPercentage,
                request.RegistrationNumber,
                request.Notes,
                request.CountryCode,
                request.PricingMode),
            cancellationToken);

        return ToResponse(result);
    }

    private static async Task<IResult> UpdateNotificationsAsync(
        UpdateTenantNotificationChannelsRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<TenantNotificationChannelsDto> result = await sender.Send(
            new UpdateTenantNotificationChannelsCommand(
                request.EmailEnabled,
                request.InAppEnabled,
                request.SmsEnabled,
                request.WeeklyDigestEnabled),
            cancellationToken);

        return ToResponse(result);
    }

    private static async Task<IResult> ListTeamMembersAsync(ISender sender, CancellationToken cancellationToken)
    {
        Result<IReadOnlyList<TeamMemberDto>> result = await sender.Send(new ListTeamMembersQuery(), cancellationToken);
        return ToResponse(result);
    }

    private static async Task<IResult> InviteTeamMemberAsync(
        InviteTeamMemberRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        if (!Enum.TryParse(request.Role, ignoreCase: true, out Domain.Role role))
        {
            return Results.Json(
                ApiResponse<object?>.Fail(
                [
                    new ApiError(
                        "Team.InvalidRole",
                        "Role must be Owner, Admin, or Staff.",
                        ErrorType.Validation.ToString())
                ]),
                statusCode: StatusCodes.Status400BadRequest);
        }

        Result<InviteTeamMemberResultDto> result = await sender.Send(
            new InviteTeamMemberCommand(request.FullName, request.Email, role),
            cancellationToken);

        if (result.IsSuccess && result.Value is not null)
        {
            return Results.Created($"/api/v1/settings/team/{result.Value.UserId}", ApiResponse<InviteTeamMemberResultDto>.Ok(result.Value));
        }

        return ToResponse(result);
    }

    private static async Task<IResult> UpdateTeamMemberRoleAsync(
        Guid userId,
        UpdateTeamMemberRoleRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        if (!Enum.TryParse(request.Role, ignoreCase: true, out Domain.Role role))
        {
            return Results.Json(
                ApiResponse<object?>.Fail(
                [
                    new ApiError(
                        "Team.InvalidRole",
                        "Role must be Owner, Admin, or Staff.",
                        ErrorType.Validation.ToString())
                ]),
                statusCode: StatusCodes.Status400BadRequest);
        }

        Result<TeamMemberDto> result = await sender.Send(
            new UpdateTeamMemberRoleCommand(userId, role),
            cancellationToken);

        return ToResponse(result);
    }

    private static async Task<IResult> DeactivateTeamMemberAsync(
        Guid userId,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result result = await sender.Send(new DeactivateTeamMemberCommand(userId), cancellationToken);
        return ToResponse(result);
    }

    private static IResult ToResponse(Result result)
    {
        if (result.IsSuccess)
        {
            return Results.Ok(ApiResponse<object?>.Ok(null));
        }

        return Failure(result.Errors);
    }

    private static IResult ToResponse<T>(Result<T> result)
    {
        if (result.IsSuccess && result.Value is not null)
        {
            return Results.Ok(ApiResponse<T>.Ok(result.Value));
        }

        return Failure(result.Errors);
    }

    private static IResult Failure(IReadOnlyList<Error> errors)
    {
        ApiError[] apiErrors = errors
            .Select(error => new ApiError(error.Code, error.Message, error.Type.ToString()))
            .ToArray();

        int statusCode = errors.FirstOrDefault()?.Type switch
        {
            ErrorType.Validation => StatusCodes.Status400BadRequest,
            ErrorType.NotFound => StatusCodes.Status404NotFound,
            ErrorType.Conflict => StatusCodes.Status409Conflict,
            ErrorType.Forbidden => StatusCodes.Status403Forbidden,
            _ => StatusCodes.Status500InternalServerError
        };

        return Results.Json(ApiResponse<object?>.Fail(apiErrors), statusCode: statusCode);
    }

    private sealed record UpdateTenantBrandingRequest(string BrandColour, string? LogoUrl);

    private sealed record GetTenantLogoUploadUrlRequest(string FileName, string ContentType);

    private sealed record UpdateTenantTaxConfigRequest(
        string Label,
        decimal TaxPercentage,
        string RegistrationNumber,
        string Notes,
        string CountryCode,
        string PricingMode);

    private sealed record UpdateTenantNotificationChannelsRequest(
        bool EmailEnabled,
        bool InAppEnabled,
        bool SmsEnabled,
        bool WeeklyDigestEnabled);

    private sealed record InviteTeamMemberRequest(string FullName, string Email, string Role);

    private sealed record UpdateTeamMemberRoleRequest(string Role);
}
