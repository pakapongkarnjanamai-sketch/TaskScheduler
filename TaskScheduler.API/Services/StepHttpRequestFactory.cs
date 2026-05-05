using System.Text;
using System.Text.Json;

namespace TaskScheduler.API.Services;

public sealed class StepHttpRequestDefinition
{
    public string ApiUrl { get; init; } = string.Empty;

    public string HttpMethod { get; init; } = "GET";

    public string? Headers { get; init; }

    public string? Body { get; init; }
}

public static class StepHttpRequestFactory
{
    public static HttpRequestMessage Create(StepHttpRequestDefinition definition)
    {
        if (string.IsNullOrWhiteSpace(definition.ApiUrl))
        {
            throw new InvalidOperationException("API URL is required.");
        }

        if (!Uri.TryCreate(definition.ApiUrl, UriKind.Absolute, out var requestUri))
        {
            throw new InvalidOperationException("API URL must be an absolute URL.");
        }

        var methodName = string.IsNullOrWhiteSpace(definition.HttpMethod)
            ? HttpMethod.Get.Method
            : definition.HttpMethod.Trim().ToUpperInvariant();
        var method = new HttpMethod(methodName);
        var headers = ParseHeaders(definition.Headers).ToList();
        var contentType = headers
            .FirstOrDefault(header => string.Equals(header.Name, "Content-Type", StringComparison.OrdinalIgnoreCase))
            .Value;

        var request = new HttpRequestMessage(method, requestUri);

        if (!string.IsNullOrWhiteSpace(definition.Body) && SupportsRequestBody(method))
        {
            request.Content = string.IsNullOrWhiteSpace(contentType)
                ? new StringContent(definition.Body, Encoding.UTF8, "application/json")
                : new StringContent(definition.Body, Encoding.UTF8, contentType);
        }

        foreach (var header in headers)
        {
            if (string.Equals(header.Name, "Content-Type", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (request.Headers.TryAddWithoutValidation(header.Name, header.Value))
            {
                continue;
            }

            if (request.Content is null)
            {
                throw new InvalidOperationException($"Header '{header.Name}' requires a compatible request body.");
            }

            if (!request.Content.Headers.TryAddWithoutValidation(header.Name, header.Value))
            {
                throw new InvalidOperationException($"Header '{header.Name}' is not valid.");
            }
        }

        return request;
    }

    private static IEnumerable<(string Name, string Value)> ParseHeaders(string? rawHeaders)
    {
        if (string.IsNullOrWhiteSpace(rawHeaders))
        {
            return [];
        }

        var trimmedHeaders = rawHeaders.Trim();
        return trimmedHeaders.StartsWith('{')
            ? ParseJsonHeaders(trimmedHeaders)
            : ParseLineHeaders(trimmedHeaders);
    }

    private static IEnumerable<(string Name, string Value)> ParseJsonHeaders(string rawHeaders)
    {
        JsonDocument document;

        try
        {
            document = JsonDocument.Parse(rawHeaders);
        }
        catch (JsonException exception)
        {
            throw new InvalidOperationException($"Headers JSON is invalid: {exception.Message}");
        }

        using (document)
        {
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                throw new InvalidOperationException("Headers JSON must be an object.");
            }

            foreach (var property in document.RootElement.EnumerateObject())
            {
                if (property.Value.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in property.Value.EnumerateArray())
                    {
                        yield return (property.Name, item.ToString());
                    }

                    continue;
                }

                yield return (property.Name, property.Value.ToString());
            }
        }
    }

    private static IEnumerable<(string Name, string Value)> ParseLineHeaders(string rawHeaders)
    {
        var lines = rawHeaders
            .Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        foreach (var line in lines)
        {
            var separatorIndex = line.IndexOf(':');
            if (separatorIndex <= 0)
            {
                throw new InvalidOperationException($"Header line '{line}' must use the format 'Name: Value'.");
            }

            var name = line[..separatorIndex].Trim();
            var value = line[(separatorIndex + 1)..].Trim();
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new InvalidOperationException("Header name is required.");
            }

            yield return (name, value);
        }
    }

    private static bool SupportsRequestBody(HttpMethod method)
    {
        return method != HttpMethod.Get && method != HttpMethod.Head;
    }
}