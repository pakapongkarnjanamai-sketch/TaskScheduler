using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TaskScheduler.API.Controllers;

[AllowAnonymous]
[Route("api/[controller]")]
[ApiController]
public sealed class RequestTestController : ControllerBase
{
    private static readonly JsonSerializerOptions CamelCaseJsonOptions = new(JsonSerializerDefaults.Web);

    [AcceptVerbs("GET", "POST", "PUT", "PATCH", "DELETE")]
    [Route("Echo/{*path}")]
    public async Task<IActionResult> Echo(string? path, CancellationToken cancellationToken)
    {
        var body = await ReadBodyAsync();

        if (Request.Query.TryGetValue("delayMs", out var delayMsValues)
            && int.TryParse(delayMsValues.ToString(), out var delayMs)
            && delayMs > 0)
        {
            await Task.Delay(delayMs, cancellationToken);
        }

        var statusCode = 200;
        if (Request.Query.TryGetValue("statusCode", out var statusCodeValues)
            && int.TryParse(statusCodeValues.ToString(), out var configuredStatusCode)
            && configuredStatusCode >= 100
            && configuredStatusCode <= 599)
        {
            statusCode = configuredStatusCode;
        }

        return new JsonResult(new
        {
            message = "Request received.",
            data = new
            {
                method = Request.Method,
                path = path ?? string.Empty,
                queryString = Request.QueryString.Value ?? string.Empty,
                query = Request.Query.ToDictionary(
                    item => item.Key,
                    item => item.Value.ToArray(),
                    StringComparer.OrdinalIgnoreCase),
                headers = Request.Headers.ToDictionary(
                    header => header.Key,
                    header => header.Value.ToArray(),
                    StringComparer.OrdinalIgnoreCase),
                body,
                contentType = Request.ContentType,
                receivedAt = DateTimeOffset.UtcNow
            }
        }, CamelCaseJsonOptions)
        {
            StatusCode = statusCode
        };
    }

    private async Task<string> ReadBodyAsync()
    {
        if (Request.ContentLength is null or 0)
        {
            return string.Empty;
        }

        Request.EnableBuffering();

        using var reader = new StreamReader(Request.Body, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        Request.Body.Position = 0;

        return body;
    }
}