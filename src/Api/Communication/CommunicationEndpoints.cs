using Api.Auth;
using Api.Contracts;
using Api.Tenancy;
using Application.Meetings;
using Application.Meetings.Dtos;
using Application.Messaging;
using Application.Messaging.Dtos;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using System.Security.Claims;
using Shared;

namespace Api.Communication;

public static class CommunicationEndpoints
{
    public static IEndpointRouteBuilder MapCommunicationEndpoints(this IEndpointRouteBuilder endpoints)
    {
        ArgumentNullException.ThrowIfNull(endpoints);

        RouteGroupBuilder messagesGroup = endpoints.MapGroup("/api/v1/messages")
            .WithTags("Messaging")
            .RequireTenant()
            .RequireAuthorization();

        messagesGroup.MapGet("/threads", GetThreadsAsync).WithName("MessagesGetThreads");
        messagesGroup.MapPost("/threads", CreateThreadAsync).WithName("MessagesCreateThread");
        messagesGroup.MapGet("/threads/{id:guid}/messages", GetThreadMessagesAsync).WithName("MessagesGetThreadMessages");
        messagesGroup.MapPost("/threads/{id:guid}/attachments/upload-url", GetMessageAttachmentUploadUrlAsync).WithName("MessagesGetAttachmentUploadUrl");
        messagesGroup.MapPost("/threads/{id:guid}/messages", SendMessageAsync).WithName("MessagesSendMessage");
        messagesGroup.MapDelete("/threads/{id:guid}/messages/{messageId:guid}", DeleteMessageAsync).WithName("MessagesDeleteMessage");
        messagesGroup.MapPut("/threads/{id:guid}/read", MarkThreadReadAsync).WithName("MessagesMarkThreadRead");

        RouteGroupBuilder noticesGroup = endpoints.MapGroup("/api/v1/notices")
            .WithTags("Notices")
            .RequireTenant()
            .RequireAuthorization(AuthorizationPolicies.RequireAnyStaff);

        noticesGroup.MapGet("/", GetNoticesAsync).WithName("NoticesGet");
        noticesGroup.MapGet("/{id:guid}", GetNoticeByIdAsync).WithName("NoticesGetById");
        noticesGroup.MapPost("/", PublishNoticeAsync).WithName("NoticesCreate");
        noticesGroup.MapPut("/{id:guid}", UpdateNoticeAsync).WithName("NoticesUpdate");
        noticesGroup.MapDelete("/{id:guid}", DeleteNoticeAsync).WithName("NoticesDelete");

        RouteGroupBuilder meetingsGroup = endpoints.MapGroup("/api/v1/meetings")
            .WithTags("Meetings")
            .RequireTenant()
            .RequireAuthorization(AuthorizationPolicies.RequireAnyStaff);

        meetingsGroup.MapGet("/", GetMeetingsAsync).WithName("MeetingsGet");
        meetingsGroup.MapGet("/{id:guid}", GetMeetingByIdAsync).WithName("MeetingsGetById");
        meetingsGroup.MapPost("/", ScheduleMeetingAsync).WithName("MeetingsCreate");
        meetingsGroup.MapPut("/{id:guid}", UpdateMeetingAsync).WithName("MeetingsUpdate");
        meetingsGroup.MapDelete("/{id:guid}", CancelMeetingAsync).WithName("MeetingsDelete");

        return endpoints;
    }

    private static async Task<IResult> GetThreadsAsync(
        ClaimsPrincipal principal,
        int page,
        int pageSize,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<Guid> userIdResult = ResolveUserId(principal);
        if (userIdResult.IsFailed)
        {
            return Failure(userIdResult.Errors);
        }

        Result<PagedResult<MessageThreadListItemDto>> result = await sender.Send(
            new GetThreadsQuery(userIdResult.Value, page <= 0 ? 1 : page, pageSize <= 0 ? 20 : pageSize),
            cancellationToken);

        return ToResponse(result);
    }

    private static async Task<IResult> CreateThreadAsync(
        ClaimsPrincipal principal,
        CreateThreadRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<Guid> userIdResult = ResolveUserId(principal);
        if (userIdResult.IsFailed)
        {
            return Failure(userIdResult.Errors);
        }

        Result<Guid> result = await sender.Send(
            new CreateThreadCommand(
                request.ClientId,
                request.ProjectId,
                userIdResult.Value,
                request.ParticipantIds,
                request.Subject),
            cancellationToken);

        if (result.IsSuccess && result.Value != Guid.Empty)
        {
            return Results.Created($"/api/v1/messages/threads/{result.Value}", ApiResponse<Guid>.Ok(result.Value));
        }

        return ToResponse(result);
    }

    private static async Task<IResult> GetThreadMessagesAsync(
        Guid id,
        ClaimsPrincipal principal,
        ISender sender,
        CancellationToken cancellationToken,
        int page = 1,
        int pageSize = 50,
        bool includeSoftDeleted = false)
    {
        Result<Guid> userIdResult = ResolveUserId(principal);
        if (userIdResult.IsFailed)
        {
            return Failure(userIdResult.Errors);
        }

        Result<PagedResult<MessageHistoryItemDto>> result = await sender.Send(
            new GetThreadMessagesQuery(
                id,
                userIdResult.Value,
                page <= 0 ? 1 : page,
                pageSize <= 0 ? 50 : pageSize,
                includeSoftDeleted),
            cancellationToken);

        return ToResponse(result);
    }

    private static async Task<IResult> SendMessageAsync(
        Guid id,
        ClaimsPrincipal principal,
        SendMessageRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<Guid> userIdResult = ResolveUserId(principal);
        if (userIdResult.IsFailed)
        {
            return Failure(userIdResult.Errors);
        }

        Result<Guid> result = await sender.Send(
            new SendMessageCommand(
                id,
                userIdResult.Value,
                request.SenderRole,
                request.ClientMessageId,
                request.Content,
                request.ReplyToMessageId,
                request.EmojiReaction,
                request.Attachment),
            cancellationToken);

        if (result.IsSuccess && result.Value != Guid.Empty)
        {
            return Results.Created($"/api/v1/messages/threads/{id}/messages/{result.Value}", ApiResponse<Guid>.Ok(result.Value));
        }

        return ToResponse(result);
    }

    private static async Task<IResult> GetMessageAttachmentUploadUrlAsync(
        Guid id,
        ClaimsPrincipal principal,
        MessageAttachmentUploadUrlRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<Guid> userIdResult = ResolveUserId(principal);
        if (userIdResult.IsFailed)
        {
            return Failure(userIdResult.Errors);
        }

        Result<MessageAttachmentUploadUrlResultDto> result = await sender.Send(
            new GetMessageAttachmentUploadUrlCommand(
                id,
                userIdResult.Value,
                new MessageAttachmentMetadataDto(
                    request.FileName,
                    request.ContentType,
                    request.SizeBytes,
                    request.Url)),
            cancellationToken);

        return ToResponse(result);
    }

    private static async Task<IResult> MarkThreadReadAsync(
        Guid id,
        ClaimsPrincipal principal,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<Guid> userIdResult = ResolveUserId(principal);
        if (userIdResult.IsFailed)
        {
            return Failure(userIdResult.Errors);
        }

        Result<int> result = await sender.Send(new MarkThreadReadCommand(id, userIdResult.Value), cancellationToken);
        return ToResponse(result);
    }

    private static async Task<IResult> DeleteMessageAsync(
        Guid id,
        Guid messageId,
        ClaimsPrincipal principal,
        [FromBody] DeleteMessageRequest request,
        [FromServices] ISender sender,
        CancellationToken cancellationToken)
    {
        Result<Guid> userIdResult = ResolveUserId(principal);
        if (userIdResult.IsFailed)
        {
            return Failure(userIdResult.Errors);
        }

        Result result = await sender.Send(
            new DeleteMessageCommand(
                id,
                messageId,
                userIdResult.Value,
                request.Reason,
                request.IsModerationAction),
            cancellationToken);

        return ToResponse(result);
    }

    private static async Task<IResult> GetNoticesAsync(
        int page,
        int pageSize,
        Guid? clientId,
        bool activeOnly,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<PagedResult<NoticeListItemDto>> result = await sender.Send(
            new GetNoticesQuery(page <= 0 ? 1 : page, pageSize <= 0 ? 20 : pageSize, clientId, activeOnly),
            cancellationToken);
        return ToResponse(result);
    }

    private static async Task<IResult> GetNoticeByIdAsync(Guid id, ISender sender, CancellationToken cancellationToken)
    {
        Result<NoticeListItemDto> result = await sender.Send(new GetNoticeByIdQuery(id), cancellationToken);
        return ToResponse(result);
    }

    private static async Task<IResult> PublishNoticeAsync(
        PublishNoticeRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<Guid> result = await sender.Send(
            new PublishNoticeCommand(request.Title, request.Content, request.ExpiresAt, request.TargetClientIds),
            cancellationToken);

        if (result.IsSuccess && result.Value != Guid.Empty)
        {
            return Results.Created($"/api/v1/notices/{result.Value}", ApiResponse<Guid>.Ok(result.Value));
        }

        return ToResponse(result);
    }

    private static async Task<IResult> UpdateNoticeAsync(
        Guid id,
        UpdateNoticeRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result result = await sender.Send(
            new UpdateNoticeCommand(id, request.Title, request.Content, request.ExpiresAt, request.IsActive, request.TargetClientIds),
            cancellationToken);
        return ToResponse(result);
    }

    private static async Task<IResult> DeleteNoticeAsync(Guid id, ISender sender, CancellationToken cancellationToken)
    {
        Result result = await sender.Send(new DeleteNoticeCommand(id), cancellationToken);
        return ToResponse(result);
    }

    private static async Task<IResult> GetMeetingsAsync(
        int page,
        int pageSize,
        Guid? clientId,
        DateTime? scheduledFrom,
        DateTime? scheduledTo,
        Domain.MeetingStatus? status,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<PagedResult<MeetingListItemDto>> result = await sender.Send(
            new GetMeetingsQuery(page <= 0 ? 1 : page, pageSize <= 0 ? 20 : pageSize, clientId, scheduledFrom, scheduledTo, status),
            cancellationToken);
        return ToResponse(result);
    }

    private static async Task<IResult> GetMeetingByIdAsync(Guid id, ISender sender, CancellationToken cancellationToken)
    {
        Result<MeetingListItemDto> result = await sender.Send(new GetMeetingByIdQuery(id), cancellationToken);
        return ToResponse(result);
    }

    private static async Task<IResult> ScheduleMeetingAsync(
        ScheduleMeetingRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<Guid> result = await sender.Send(
            new ScheduleMeetingCommand(
                request.ClientId,
                request.Title,
                request.Description,
                request.ScheduledAt,
                request.DurationMinutes,
                request.MeetingUrl,
                request.Attendees),
            cancellationToken);

        if (result.IsSuccess && result.Value != Guid.Empty)
        {
            return Results.Created($"/api/v1/meetings/{result.Value}", ApiResponse<Guid>.Ok(result.Value));
        }

        return ToResponse(result);
    }

    private static async Task<IResult> UpdateMeetingAsync(
        Guid id,
        UpdateMeetingRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result result = await sender.Send(
            new UpdateMeetingCommand(
                id,
                request.Title,
                request.Description,
                request.ScheduledAt,
                request.DurationMinutes,
                request.MeetingUrl,
                request.Attendees),
            cancellationToken);
        return ToResponse(result);
    }

    private static async Task<IResult> CancelMeetingAsync(Guid id, ISender sender, CancellationToken cancellationToken)
    {
        Result result = await sender.Send(new CancelMeetingCommand(id), cancellationToken);
        return ToResponse(result);
    }

    private static Result<Guid> ResolveUserId(ClaimsPrincipal principal)
    {
        string? userIdClaimValue = principal.FindFirstValue("userId");
        if (!Guid.TryParse(userIdClaimValue, out Guid userId))
        {
            return Result<Guid>.Failure(new Error(
                "Auth.InvalidUserContext",
                "Authenticated user context is invalid.",
                ErrorType.Forbidden));
        }

        return Result<Guid>.Success(userId);
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
}

public sealed record CreateThreadRequest(
    Guid ClientId,
    Guid? ProjectId,
    IReadOnlyCollection<Guid> ParticipantIds,
    string Subject);

public sealed record SendMessageRequest(
    string SenderRole,
    string ClientMessageId,
    string Content,
    Guid? ReplyToMessageId,
    string? EmojiReaction,
    MessageAttachmentMetadataDto? Attachment);

public sealed record MessageAttachmentUploadUrlRequest(
    string FileName,
    string ContentType,
    long SizeBytes,
    string Url);

public sealed record DeleteMessageRequest(
    string Reason,
    bool IsModerationAction = false);

public sealed record PublishNoticeRequest(
    string Title,
    string Content,
    DateTime? ExpiresAt,
    IReadOnlyCollection<Guid>? TargetClientIds);

public sealed record UpdateNoticeRequest(
    string Title,
    string Content,
    DateTime? ExpiresAt,
    bool IsActive,
    IReadOnlyCollection<Guid>? TargetClientIds);

public sealed record ScheduleMeetingRequest(
    Guid ClientId,
    string Title,
    string Description,
    DateTime ScheduledAt,
    int DurationMinutes,
    string MeetingUrl,
    IReadOnlyCollection<Guid> Attendees);

public sealed record UpdateMeetingRequest(
    string Title,
    string Description,
    DateTime ScheduledAt,
    int DurationMinutes,
    string MeetingUrl,
    IReadOnlyCollection<Guid> Attendees);
