using Application.Abstractions;
using MediatR;
using Shared;

namespace Application.Behaviours;

public sealed class TenantBehaviour<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
    where TResponse : Result
{
    private static readonly Error TenantUnresolvedError = new(
        "Tenant.Unresolved",
        "Tenant context could not be resolved for the current request.",
        ErrorType.Forbidden);

    private readonly ICurrentTenant _currentTenant;

    public TenantBehaviour(ICurrentTenant currentTenant)
    {
        _currentTenant = currentTenant;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (request is ITenantOptionalRequest || _currentTenant.IsResolved)
        {
            return await next();
        }

        return CreateFailure([TenantUnresolvedError]);
    }

    private static TResponse CreateFailure(IReadOnlyList<Error> errors)
    {
        if (typeof(TResponse) == typeof(Result))
        {
            return (TResponse)(object)Result.Failure(errors);
        }

        if (typeof(TResponse).IsGenericType && typeof(TResponse).GetGenericTypeDefinition() == typeof(Result<>))
        {
            Type resultType = typeof(TResponse);
            Type valueType = resultType.GetGenericArguments()[0];
            Type genericResultType = typeof(Result<>).MakeGenericType(valueType);
            System.Reflection.MethodInfo? failureMethod = genericResultType.GetMethod(
                nameof(Result<object>.Failure),
                [typeof(IReadOnlyList<Error>)]);

            if (failureMethod is null)
            {
                throw new InvalidOperationException($"Unable to create tenant failure for response type '{resultType.Name}'.");
            }

            object? failure = failureMethod.Invoke(null, [errors]);
            if (failure is TResponse typedFailure)
            {
                return typedFailure;
            }
        }

        throw new InvalidOperationException(
            $"Tenant behaviour only supports responses of type Result or Result<T>. Current type: {typeof(TResponse).Name}.");
    }
}
