using System.Net;
using System.Net.Http;
using Microsoft.Extensions.Logging.Abstractions;
using TaskScheduler.API.Contracts.StepRequestTests;
using TaskScheduler.API.Services;
using TaskScheduler.Tests.Support;

namespace TaskScheduler.Tests.API.Services;

public class StepRequestTestServiceTests
{
    [Fact]
    public async Task RunAsync_WhenHeadersAndBodyAreConfigured_ReturnsResponseDetails()
    {
        HttpRequestMessage? capturedRequest = null;

        using var httpClient = new HttpClient(new StubHttpMessageHandler((request, _) =>
        {
            capturedRequest = request;

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.Created)
            {
                Content = new StringContent("{\"received\":true}")
            });
        }));

        var service = new StepRequestTestService(
            new StubHttpClientFactory(httpClient),
            NullLogger<StepRequestTestService>.Instance);

        var result = await service.RunAsync(new StepRequestTestRequest
        {
            Name = "Echo",
            ApiUrl = "https://example.test/api/echo",
            HttpMethod = "POST",
            Headers = "X-Test: ui\nContent-Type: application/json",
            Body = "{\"hello\":\"world\"}"
        });

        Assert.True(result.IsSuccess);
        Assert.NotNull(capturedRequest);
        Assert.True(capturedRequest!.Headers.TryGetValues("X-Test", out var headerValues));
        Assert.Equal("ui", Assert.Single(headerValues));
        Assert.Equal("{\"hello\":\"world\"}", await capturedRequest.Content!.ReadAsStringAsync());
        Assert.NotNull(result.Value);
        Assert.Equal(201, result.Value!.Response.StatusCode);
        Assert.Equal("POST", result.Value.Request.Method);
    }

    [Fact]
    public async Task RunAsync_WhenUrlIsMissing_ReturnsValidationError()
    {
        using var httpClient = new HttpClient(new StubHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK))));

        var service = new StepRequestTestService(
            new StubHttpClientFactory(httpClient),
            NullLogger<StepRequestTestService>.Instance);

        var result = await service.RunAsync(new StepRequestTestRequest());

        Assert.False(result.IsSuccess);
        Assert.Equal("API URL is required.", result.ErrorMessage);
    }
}