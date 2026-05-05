using System.Net.Http.Headers;
using System.Diagnostics;
using TaskScheduler.API.Contracts.StepRequestTests;

namespace TaskScheduler.API.Services;

public sealed class StepRequestTestService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<StepRequestTestService> _logger;

    public StepRequestTestService(IHttpClientFactory httpClientFactory, ILogger<StepRequestTestService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<AdminOperationResult<StepRequestTestResult>> RunAsync(
        StepRequestTestRequest request,
        CancellationToken cancellationToken = default)
    {
        HttpRequestMessage requestMessage;

        try
        {
            requestMessage = StepHttpRequestFactory.Create(new StepHttpRequestDefinition
            {
                ApiUrl = request.ApiUrl,
                HttpMethod = request.HttpMethod,
                Headers = request.Headers,
                Body = request.Body
            });
        }
        catch (InvalidOperationException exception)
        {
            return AdminOperationResult<StepRequestTestResult>.Invalid(exception.Message);
        }

        var requestSnapshot = new StepRequestSnapshot
        {
            Method = requestMessage.Method.Method,
            Url = requestMessage.RequestUri?.ToString() ?? request.ApiUrl,
            Headers = GetHeaders(requestMessage.Headers, requestMessage.Content?.Headers),
            Body = request.Body
        };

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var client = _httpClientFactory.CreateClient();
            var response = await client.SendAsync(requestMessage, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync();

            stopwatch.Stop();

            return AdminOperationResult<StepRequestTestResult>.Success(new StepRequestTestResult
            {
                StepName = request.Name,
                DurationMs = stopwatch.ElapsedMilliseconds,
                Request = requestSnapshot,
                Response = new StepResponseSnapshot
                {
                    StatusCode = (int)response.StatusCode,
                    ReasonPhrase = response.ReasonPhrase,
                    IsSuccessStatusCode = response.IsSuccessStatusCode,
                    Headers = GetHeaders(response.Headers, response.Content.Headers),
                    Body = responseBody
                }
            });
        }
        catch (Exception exception)
        {
            stopwatch.Stop();
            _logger.LogWarning(exception, "Step request test failed for {ApiUrl}", request.ApiUrl);

            return AdminOperationResult<StepRequestTestResult>.Success(new StepRequestTestResult
            {
                StepName = request.Name,
                DurationMs = stopwatch.ElapsedMilliseconds,
                Request = requestSnapshot,
                Response = new StepResponseSnapshot
                {
                    ErrorMessage = exception.Message
                }
            });
        }
    }

    private static Dictionary<string, string[]> GetHeaders(
        HttpHeaders headers,
        HttpHeaders? additionalHeaders = null)
    {
        var result = headers.ToDictionary(
            header => header.Key,
            header => header.Value.ToArray(),
            StringComparer.OrdinalIgnoreCase);

        if (additionalHeaders is null)
        {
            return result;
        }

        foreach (var header in additionalHeaders)
        {
            result[header.Key] = header.Value.ToArray();
        }

        return result;
    }
}