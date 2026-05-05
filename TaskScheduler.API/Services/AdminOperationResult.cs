namespace TaskScheduler.API.Services;

public sealed class AdminOperationResult<T>
{
    private AdminOperationResult(T? value, string? errorMessage, bool isNotFound)
    {
        Value = value;
        ErrorMessage = errorMessage;
        IsNotFound = isNotFound;
    }

    public T? Value { get; }

    public string? ErrorMessage { get; }

    public bool IsNotFound { get; }

    public bool IsSuccess => ErrorMessage is null && !IsNotFound;

    public static AdminOperationResult<T> Success(T value)
    {
        return new AdminOperationResult<T>(value, null, false);
    }

    public static AdminOperationResult<T> Invalid(string errorMessage, T? value = default)
    {
        return new AdminOperationResult<T>(value, errorMessage, false);
    }

    public static AdminOperationResult<T> NotFound(string errorMessage)
    {
        return new AdminOperationResult<T>(default, errorMessage, true);
    }
}