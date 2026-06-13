using Api.Auth;
using Api.Contracts;
using Api.Tenancy;
using Application.Finance;
using Application.Finance.Dtos;
using Application.Invoices;
using Application.Invoices.Dtos;
using Domain;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Shared;

namespace Api.Finance;

public static class FinanceEndpoints
{
    public static IEndpointRouteBuilder MapFinanceEndpoints(this IEndpointRouteBuilder endpoints)
    {
        RouteGroupBuilder rfqsGroup = endpoints.MapGroup("/api/v1/rfqs")
            .WithTags("RFQs")
            .RequireTenant()
            .RequireAuthorization(AuthorizationPolicies.RequireAnyStaff);

        rfqsGroup.MapGet("/", GetRfqsAsync).WithName("RfqsGet");
        rfqsGroup.MapGet("/{id:guid}", GetRfqByIdAsync).WithName("RfqsGetById");
        rfqsGroup.MapPost("/{id:guid}/quotations", CreateQuotationFromRfqAsync).WithName("RfqsCreateQuotation");

        RouteGroupBuilder purchaseOrdersGroup = endpoints.MapGroup("/api/v1/purchase-orders")
            .WithTags("Purchase Orders")
            .RequireTenant()
            .RequireAuthorization(AuthorizationPolicies.RequireAnyStaff);

        purchaseOrdersGroup.MapGet("/", GetPurchaseOrdersAsync).WithName("PurchaseOrdersGet");
        purchaseOrdersGroup.MapGet("/{id:guid}", GetPurchaseOrderByIdAsync).WithName("PurchaseOrdersGetById");
        purchaseOrdersGroup.MapPost("/{id:guid}/approve", ApprovePurchaseOrderAsync).WithName("PurchaseOrdersApprove");
        purchaseOrdersGroup.MapPost("/{id:guid}/reject", RejectPurchaseOrderAsync).WithName("PurchaseOrdersReject");

        RouteGroupBuilder paymentSubmissionsGroup = endpoints.MapGroup("/api/v1/invoices")
            .WithTags("Invoice Payment Submissions")
            .RequireTenant()
            .RequireAuthorization(AuthorizationPolicies.RequireAnyStaff);

        paymentSubmissionsGroup.MapGet("/{invoiceId:guid}/payment-submissions", GetInvoicePaymentSubmissionsAsync)
            .WithName("InvoicePaymentSubmissionsGet");

        RouteGroupBuilder submissionActionsGroup = endpoints.MapGroup("/api/v1/invoices/payment-submissions")
            .WithTags("Invoice Payment Submissions")
            .RequireTenant()
            .RequireAuthorization(AuthorizationPolicies.RequireAnyStaff);

        submissionActionsGroup.MapPost("/{submissionId:guid}/approve", ApproveInvoicePaymentSubmissionAsync)
            .WithName("InvoicePaymentSubmissionsApprove");
        submissionActionsGroup.MapPost("/{submissionId:guid}/reject", RejectInvoicePaymentSubmissionAsync)
            .WithName("InvoicePaymentSubmissionsReject");

        RouteGroupBuilder financeAnalyticsGroup = endpoints.MapGroup("/api/v1/finance")
            .WithTags("Finance Analytics")
            .RequireTenant()
            .RequireAuthorization(AuthorizationPolicies.RequireAnyStaff);

        financeAnalyticsGroup.MapGet("/analytics", GetFinanceAnalyticsAsync).WithName("FinanceAnalyticsGet");

        return endpoints;
    }

    private static async Task<IResult> GetRfqsAsync(
        int page,
        int pageSize,
        RfqStatus? status,
        Guid? clientId,
        ISender sender,
        CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(
            new GetRfqsQuery(page <= 0 ? 1 : page, pageSize <= 0 ? 20 : pageSize, status, clientId),
            cancellationToken));
    }

    private static async Task<IResult> GetRfqByIdAsync(Guid id, Guid clientId, ISender sender, CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(new GetRfqByIdQuery(id, clientId), cancellationToken));
    }

    private static async Task<IResult> CreateQuotationFromRfqAsync(
        Guid id,
        CreateQuotationFromRfqApiRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<QuoteDto> result = await sender.Send(
            new CreateQuotationFromRfqCommand(
                id,
                request.ClientId,
                request.QuoteNumber,
                request.DueDate,
                request.LineItems,
                request.Notes),
            cancellationToken);

        if (result.IsSuccess && result.Value is not null)
        {
            return Results.Created($"/api/v1/quotes/{result.Value.Id}", ApiResponse<QuoteDto>.Ok(result.Value));
        }

        return ToResponse(result);
    }

    private static async Task<IResult> GetPurchaseOrdersAsync(
        int page,
        int pageSize,
        PurchaseOrderStatus? status,
        Guid? clientId,
        ISender sender,
        CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(
            new GetPurchaseOrdersQuery(page <= 0 ? 1 : page, pageSize <= 0 ? 20 : pageSize, status, clientId),
            cancellationToken));
    }

    private static async Task<IResult> GetPurchaseOrderByIdAsync(
        Guid id,
        Guid clientId,
        ISender sender,
        CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(new GetPurchaseOrderByIdQuery(id, clientId), cancellationToken));
    }

    private static async Task<IResult> ApprovePurchaseOrderAsync(
        Guid id,
        ApprovePurchaseOrderApiRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(
            new ApprovePurchaseOrderCommand(id, request.ClientId, request.InvoiceNumber, request.DueDate),
            cancellationToken));
    }

    private static async Task<IResult> RejectPurchaseOrderAsync(
        Guid id,
        PurchaseOrderClientRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(new RejectPurchaseOrderCommand(id, request.ClientId), cancellationToken));
    }

    private static async Task<IResult> GetInvoicePaymentSubmissionsAsync(
        Guid invoiceId,
        Guid clientId,
        ISender sender,
        CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(new GetInvoicePaymentSubmissionsQuery(invoiceId, clientId), cancellationToken));
    }

    private static async Task<IResult> ApproveInvoicePaymentSubmissionAsync(
        Guid submissionId,
        ISender sender,
        CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(new ApproveInvoicePaymentSubmissionCommand(submissionId), cancellationToken));
    }

    private static async Task<IResult> RejectInvoicePaymentSubmissionAsync(
        Guid submissionId,
        RejectInvoicePaymentSubmissionApiRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(
            new RejectInvoicePaymentSubmissionCommand(submissionId, request.ReviewNotes),
            cancellationToken));
    }

    private static async Task<IResult> GetFinanceAnalyticsAsync(
        Guid? clientId,
        DateOnly? asOfDate,
        ISender sender,
        CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(new GetFinanceAnalyticsQuery(clientId, asOfDate), cancellationToken));
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

        if (result.IsSuccess)
        {
            return Results.Ok(ApiResponse<object?>.Ok(null));
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

public sealed record CreateQuotationFromRfqApiRequest(
    Guid ClientId,
    string QuoteNumber,
    DateOnly DueDate,
    IReadOnlyCollection<CreateInvoiceLineItemInput> LineItems,
    string? Notes = null);

public sealed record ApprovePurchaseOrderApiRequest(
    Guid ClientId,
    string InvoiceNumber,
    DateOnly DueDate);

public sealed record PurchaseOrderClientRequest(Guid ClientId);

public sealed record RejectInvoicePaymentSubmissionApiRequest(string? ReviewNotes);
