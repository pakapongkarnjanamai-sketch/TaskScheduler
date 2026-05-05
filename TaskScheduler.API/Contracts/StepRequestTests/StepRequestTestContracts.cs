namespace TaskScheduler.API.Contracts.StepRequestTests;

public sealed class StepRequestTestRequest
{
    public string Name { get; set; } = string.Empty;

    public string ApiUrl { get; set; } = string.Empty;

    public string HttpMethod { get; set; } = "GET";

    public string? Headers { get; set; }

    public string? Body { get; set; }
}

public sealed class StepRequestTestResult
{
    public string StepName { get; init; } = string.Empty;

    public long DurationMs { get; init; }

    public StepRequestSnapshot Request { get; init; } = new();

    public StepResponseSnapshot Response { get; init; } = new();
}

public sealed class StepRequestSnapshot
{
    public string Method { get; init; } = string.Empty;

    public string Url { get; init; } = string.Empty;

    public Dictionary<string, string[]> Headers { get; init; } = new(StringComparer.OrdinalIgnoreCase);

    public string? Body { get; init; }
}

public sealed class StepResponseSnapshot
{
    public int? StatusCode { get; init; }

    public string? ReasonPhrase { get; init; }

    public bool IsSuccessStatusCode { get; init; }

    public Dictionary<string, string[]> Headers { get; init; } = new(StringComparer.OrdinalIgnoreCase);

    public string? Body { get; init; }

    public string? ErrorMessage { get; init; }
}