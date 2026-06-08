using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Api.Middleware;

public sealed class GlobalExceptionHandler : IExceptionHandler
{
    private static readonly Uri ValidationTypeUri = new("https://datatracker.ietf.org/doc/html/rfc9110#section-15.5.1");
    private static readonly Uri ForbiddenTypeUri = new("https://datatracker.ietf.org/doc/html/rfc9110#section-15.5.4");
    private static readonly Uri NotFoundTypeUri = new("https://datatracker.ietf.org/doc/html/rfc9110#section-15.5.5");
    private static readonly Uri ConflictTypeUri = new("https://datatracker.ietf.org/doc/html/rfc9110#section-15.5.10");
    private static readonly Uri ServerErrorTypeUri = new("https://datatracker.ietf.org/doc/html/rfc9110#section-15.6.1");

    private readonly ILogger<GlobalExceptionHandler> _logger;
    private readonly IProblemDetailsService _problemDetailsService;

    public GlobalExceptionHandler(
        ILogger<GlobalExceptionHandler> logger,
        IProblemDetailsService problemDetailsService)
    {
        _logger = logger;
        _problemDetailsService = problemDetailsService;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        (int statusCode, string title, Uri typeUri) = MapException(exception);
        ProblemDetails problemDetails = new()
        {
            Status = statusCode,
            Title = title,
            Type = typeUri.ToString(),
            Detail = GetSafeDetail(exception, statusCode),
            Instance = httpContext.Request.Path
        };

        problemDetails.Extensions["traceId"] = httpContext.TraceIdentifier;

        if (exception is ValidationException validationException)
        {
            problemDetails.Extensions["errors"] = validationException.Errors
                .GroupBy(error => error.PropertyName)
                .ToDictionary(
                    group => group.Key,
                    group => group.Select(error => error.ErrorMessage).Distinct().ToArray());
        }

        _logger.LogError(
            exception,
            "Unhandled exception processed as ProblemDetails. StatusCode: {StatusCode}, Title: {Title}, TraceId: {TraceId}",
            statusCode,
            title,
            httpContext.TraceIdentifier);

        httpContext.Response.StatusCode = statusCode;
        return await _problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problemDetails
        });
    }

    private static (int StatusCode, string Title, Uri TypeUri) MapException(Exception exception)
    {
        return exception switch
        {
            BadHttpRequestException => (StatusCodes.Status400BadRequest, "Bad request.", ValidationTypeUri),
            ValidationException => (StatusCodes.Status400BadRequest, "Validation failed.", ValidationTypeUri),
            ArgumentException => (StatusCodes.Status400BadRequest, "Invalid request.", ValidationTypeUri),
            KeyNotFoundException => (StatusCodes.Status404NotFound, "Resource not found.", NotFoundTypeUri),
            InvalidOperationException => (StatusCodes.Status409Conflict, "Request conflict.", ConflictTypeUri),
            UnauthorizedAccessException => (StatusCodes.Status403Forbidden, "Forbidden.", ForbiddenTypeUri),
            _ => (StatusCodes.Status500InternalServerError, "Internal Server Error.", ServerErrorTypeUri)
        };
    }

    private static string GetSafeDetail(Exception exception, int statusCode)
    {
        if (statusCode == StatusCodes.Status500InternalServerError)
        {
            return "An unexpected error occurred while processing the request.";
        }

        if (exception is BadHttpRequestException badHttpRequestException)
        {
            return badHttpRequestException.Message;
        }

        return exception.Message;
    }
}
