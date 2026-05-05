namespace TaskScheduler.API.Contracts;

public sealed class ApiResponse<T>
{
    public bool Success { get; init; }

    public string Message { get; init; } = string.Empty;

    public T? Data { get; init; }

    public IReadOnlyList<ApiError> Errors { get; init; } = Array.Empty<ApiError>();

    public string? CorrelationId { get; init; }
}

public sealed class ApiError
{
    public string Code { get; init; } = string.Empty;

    public string Message { get; init; } = string.Empty;
}