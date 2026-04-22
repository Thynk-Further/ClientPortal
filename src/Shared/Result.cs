namespace Shared;

public class Result
{
    protected Result(bool isSuccess, IReadOnlyList<Error> errors)
    {
        if (isSuccess && errors.Count > 0)
        {
            throw new ArgumentException("Successful result cannot contain errors.", nameof(errors));
        }

        if (!isSuccess && errors.Count == 0)
        {
            throw new ArgumentException("Failed result must contain at least one error.", nameof(errors));
        }

        IsSuccess = isSuccess;
        Errors = errors;
    }

    public bool IsSuccess { get; }

    public bool IsFailed => !IsSuccess;

    public Error? Error => Errors.FirstOrDefault();

    public IReadOnlyList<Error> Errors { get; }

    public static Result Success() => new(true, []);

    public static Result Failure(Error error) => new(false, [error]);

    public static Result Failure(IReadOnlyList<Error> errors) => new(false, errors);
}

public sealed class Result<TValue> : Result
{
    private Result(bool isSuccess, TValue? value, IReadOnlyList<Error> errors)
        : base(isSuccess, errors)
    {
        Value = value;
    }

    public TValue? Value { get; }

    public static Result<TValue> Success(TValue value) => new(true, value, []);

    public static new Result<TValue> Failure(Error error) => new(false, default, [error]);

    public static new Result<TValue> Failure(IReadOnlyList<Error> errors) => new(false, default, errors);
}
