using Api.Auth;
using Api.Contracts;
using Api.Tenancy;
using Application.Invoices;
using Application.Invoices.Abstractions;
using Application.Invoices.Dtos;
using Domain;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Shared;

namespace Api.Invoices;

public static class InvoicesEndpoints
{
    public static IEndpointRouteBuilder MapInvoicesEndpoints(this IEndpointRouteBuilder endpoints)
    {
        RouteGroupBuilder invoicesGroup = endpoints.MapGroup("/api/v1/invoices")
            .WithTags("Invoices")
            .RequireTenant()
            .RequireAuthorization(AuthorizationPolicies.RequireAnyStaff);

        invoicesGroup.MapGet("/", GetInvoicesAsync).WithName("InvoicesGet");
        invoicesGroup.MapGet("/{id:guid}", GetInvoiceByIdAsync).WithName("InvoicesGetById");
        invoicesGroup.MapPost("/", CreateInvoiceAsync).WithName("InvoicesCreate");
        invoicesGroup.MapPut("/{id:guid}", UpdateInvoiceAsync).WithName("InvoicesUpdate");
        invoicesGroup.MapDelete("/{id:guid}", DeleteInvoiceAsync).WithName("InvoicesDelete");
        invoicesGroup.MapPost("/{id:guid}/send", SendInvoiceAsync).WithName("InvoicesSend");
        invoicesGroup.MapPost("/{id:guid}/payments", RecordPaymentAsync).WithName("InvoicesRecordPayment");
        invoicesGroup.MapGet("/{id:guid}/pdf", GetInvoicePdfAsync).WithName("InvoicesGetPdf");

        RouteGroupBuilder quotesGroup = endpoints.MapGroup("/api/v1/quotes")
            .WithTags("Quotes")
            .RequireTenant()
            .RequireAuthorization(AuthorizationPolicies.RequireAnyStaff);

        quotesGroup.MapGet("/", GetQuotesAsync).WithName("QuotesGet");
        quotesGroup.MapGet("/{id:guid}", GetQuoteByIdAsync).WithName("QuotesGetById");
        quotesGroup.MapPost("/", CreateQuoteAsync).WithName("QuotesCreate");
        quotesGroup.MapPost("/external", CreateExternalQuoteAsync).WithName("QuotesCreateExternal");
        quotesGroup.MapPut("/{id:guid}", UpdateQuoteAsync).WithName("QuotesUpdate");
        quotesGroup.MapDelete("/{id:guid}", DeleteQuoteAsync).WithName("QuotesDelete");
        quotesGroup.MapPost("/{id:guid}/convert", ConvertQuoteAsync).WithName("QuotesConvert");
        quotesGroup.MapPost("/{id:guid}/send", SendQuoteAsync).WithName("QuotesSend");

        RouteGroupBuilder reportsGroup = endpoints.MapGroup("/api/v1/reports")
            .WithTags("Financial Reports")
            .RequireTenant()
            .RequireAuthorization(AuthorizationPolicies.RequireAnyStaff);

        reportsGroup.MapGet("/financial", GetFinancialSummaryAsync).WithName("ReportsFinancialSummary");

        return endpoints;
    }

    private static async Task<IResult> GetInvoicesAsync(
        int page,
        int pageSize,
        InvoiceStatus? status,
        Guid? clientId,
        DateOnly? dueDateFrom,
        DateOnly? dueDateTo,
        DateOnly? asOfDate,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<GetInvoicesResultDto> result = await sender.Send(
            new GetInvoicesQuery(page <= 0 ? 1 : page, pageSize <= 0 ? 20 : pageSize, status, clientId, dueDateFrom, dueDateTo, asOfDate),
            cancellationToken);
        return ToResponse(result);
    }

    private static async Task<IResult> GetInvoiceByIdAsync(Guid id, Guid clientId, ISender sender, CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(new GetInvoiceByIdQuery(id, clientId), cancellationToken));
    }

    private static async Task<IResult> CreateInvoiceAsync(CreateInvoiceApiRequest request, ISender sender, CancellationToken cancellationToken)
    {
        Result<InvoiceDto> result = await sender.Send(
            new CreateInvoiceCommand(request.ClientId, request.ProjectId, request.InvoiceNumber, request.Currency, request.DueDate, request.LineItems, request.Notes),
            cancellationToken);

        if (result.IsSuccess && result.Value is not null)
        {
            return Results.Created($"/api/v1/invoices/{result.Value.Id}", ApiResponse<InvoiceDto>.Ok(result.Value));
        }

        return ToResponse(result);
    }

    private static async Task<IResult> UpdateInvoiceAsync(Guid id, UpdateInvoiceApiRequest request, ISender sender, CancellationToken cancellationToken)
    {
        Result result = await sender.Send(
            new UpdateInvoiceCommand(id, request.ClientId, request.InvoiceNumber, request.Currency, request.DueDate, request.LineItems, request.Notes),
            cancellationToken);
        return ToResponse(result);
    }

    private static async Task<IResult> DeleteInvoiceAsync(Guid id, Guid clientId, ISender sender, CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(new DeleteInvoiceCommand(id, clientId), cancellationToken));
    }

    private static async Task<IResult> SendInvoiceAsync(Guid id, InvoiceClientRequest request, ISender sender, CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(new SendInvoiceCommand(id, request.ClientId), cancellationToken));
    }

    private static async Task<IResult> RecordPaymentAsync(Guid id, RecordInvoicePaymentApiRequest request, ISender sender, CancellationToken cancellationToken)
    {
        Result result = await sender.Send(
            new RecordPaymentCommand(id, request.ClientId, request.Amount, request.Currency, request.Method, request.Reference, request.PaidAtUtc, request.Notes),
            cancellationToken);
        return ToResponse(result);
    }

    private static async Task<IResult> GetInvoicePdfAsync(Guid id, Guid clientId, ISender sender, CancellationToken cancellationToken)
    {
        Result<InvoicePdfDocument> result = await sender.Send(new GetInvoicePdfQuery(id, clientId), cancellationToken);
        if (result.IsSuccess && result.Value is not null)
        {
            return Results.File(result.Value.Content, result.Value.ContentType, result.Value.FileName);
        }

        return ToResponse(result);
    }

    private static async Task<IResult> GetQuotesAsync(
        int page,
        int pageSize,
        QuoteStatus? status,
        Guid? clientId,
        DateOnly? dueDateFrom,
        DateOnly? dueDateTo,
        ISender sender,
        CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(
            new GetQuotesQuery(page <= 0 ? 1 : page, pageSize <= 0 ? 20 : pageSize, status, clientId, dueDateFrom, dueDateTo),
            cancellationToken));
    }

    private static async Task<IResult> GetQuoteByIdAsync(Guid id, Guid? clientId, ISender sender, CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(new GetQuoteByIdQuery(id, clientId), cancellationToken));
    }

    private static async Task<IResult> CreateQuoteAsync(CreateQuoteApiRequest request, ISender sender, CancellationToken cancellationToken)
    {
        Result<QuoteDto> result = await sender.Send(
            new CreateQuoteCommand(request.ClientId, request.ProjectId, request.QuoteNumber, request.Currency, request.DueDate, request.LineItems, request.Notes),
            cancellationToken);

        if (result.IsSuccess && result.Value is not null)
        {
            return Results.Created($"/api/v1/quotes/{result.Value.Id}", ApiResponse<QuoteDto>.Ok(result.Value));
        }

        return ToResponse(result);
    }

    private static async Task<IResult> CreateExternalQuoteAsync(CreateExternalQuoteApiRequest request, ISender sender, CancellationToken cancellationToken)
    {
        Result<QuoteDto> result = await sender.Send(
            new CreateExternalQuoteCommand(
                request.QuoteNumber,
                request.Currency,
                request.DueDate,
                request.RecipientCompanyName,
                request.RecipientContactName,
                request.RecipientEmail,
                request.RecipientPhone,
                request.LineItems,
                request.Notes),
            cancellationToken);

        if (result.IsSuccess && result.Value is not null)
        {
            return Results.Created($"/api/v1/quotes/{result.Value.Id}", ApiResponse<QuoteDto>.Ok(result.Value));
        }

        return ToResponse(result);
    }

    private static async Task<IResult> UpdateQuoteAsync(Guid id, UpdateQuoteApiRequest request, ISender sender, CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(
            new UpdateQuoteCommand(
                id,
                request.ClientId,
                request.QuoteNumber,
                request.Currency,
                request.DueDate,
                request.LineItems,
                request.Notes,
                request.RecipientCompanyName,
                request.RecipientContactName,
                request.RecipientEmail,
                request.RecipientPhone),
            cancellationToken));
    }

    private static async Task<IResult> DeleteQuoteAsync(Guid id, Guid? clientId, ISender sender, CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(new DeleteQuoteCommand(id, clientId), cancellationToken));
    }

    private static async Task<IResult> ConvertQuoteAsync(Guid id, ConvertQuoteApiRequest request, ISender sender, CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(new ConvertQuoteToInvoiceCommand(id, request.ClientId, request.InvoiceNumber, request.DueDate), cancellationToken));
    }

    private static async Task<IResult> SendQuoteAsync(Guid id, QuoteScopeRequest request, ISender sender, CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(new SendQuoteCommand(id, request.ClientId), cancellationToken));
    }

    private static async Task<IResult> GetFinancialSummaryAsync(
        Guid? clientId,
        DateOnly? fromDate,
        DateOnly? toDate,
        DateOnly? asOfDate,
        ISender sender,
        CancellationToken cancellationToken)
    {
        return ToResponse(await sender.Send(new GetFinancialSummaryQuery(clientId, fromDate, toDate, asOfDate), cancellationToken));
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

public sealed record CreateInvoiceApiRequest(
    Guid ClientId,
    Guid ProjectId,
    string InvoiceNumber,
    string Currency,
    DateOnly DueDate,
    IReadOnlyCollection<CreateInvoiceLineItemInput> LineItems,
    string? Notes = null);

public sealed record UpdateInvoiceApiRequest(
    Guid ClientId,
    string InvoiceNumber,
    string Currency,
    DateOnly DueDate,
    IReadOnlyCollection<CreateInvoiceLineItemInput> LineItems,
    string? Notes = null);

public sealed record RecordInvoicePaymentApiRequest(
    Guid ClientId,
    decimal Amount,
    string Currency,
    string Method,
    string Reference,
    DateTime PaidAtUtc,
    string? Notes = null);

public sealed record InvoiceClientRequest(Guid ClientId);

public sealed record QuoteScopeRequest(Guid? ClientId);

public sealed record CreateQuoteApiRequest(
    Guid ClientId,
    Guid ProjectId,
    string QuoteNumber,
    string Currency,
    DateOnly DueDate,
    IReadOnlyCollection<CreateInvoiceLineItemInput> LineItems,
    string? Notes = null);

public sealed record CreateExternalQuoteApiRequest(
    string QuoteNumber,
    string Currency,
    DateOnly DueDate,
    string RecipientCompanyName,
    string? RecipientContactName,
    string? RecipientEmail,
    string? RecipientPhone,
    IReadOnlyCollection<CreateInvoiceLineItemInput> LineItems,
    string? Notes = null);

public sealed record UpdateQuoteApiRequest(
    Guid? ClientId,
    string QuoteNumber,
    string Currency,
    DateOnly DueDate,
    IReadOnlyCollection<CreateInvoiceLineItemInput> LineItems,
    string? Notes = null,
    string? RecipientCompanyName = null,
    string? RecipientContactName = null,
    string? RecipientEmail = null,
    string? RecipientPhone = null);

public sealed record ConvertQuoteApiRequest(
    Guid? ClientId,
    string InvoiceNumber,
    DateOnly DueDate);
