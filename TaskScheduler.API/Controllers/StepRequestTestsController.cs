using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using TaskScheduler.API.Contracts;
using TaskScheduler.API.Contracts.StepRequestTests;
using TaskScheduler.API.Services;

namespace TaskScheduler.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public sealed class StepRequestTestsController : ControllerBase
{
    private static readonly JsonSerializerOptions CamelCaseJsonOptions = new(JsonSerializerDefaults.Web);

    private readonly StepRequestTestService _stepRequestTestService;

    public StepRequestTestsController(StepRequestTestService stepRequestTestService)
    {
        _stepRequestTestService = stepRequestTestService;
    }

    [HttpPost("Run")]
    public async Task<IActionResult> Run([FromBody] StepRequestTestRequest request)
    {
        var result = await _stepRequestTestService.RunAsync(request, HttpContext.RequestAborted);
        if (!result.IsSuccess)
        {
            return CreateJsonResponse(new ApiResponse<object>
            {
                Success = false,
                Message = result.ErrorMessage ?? "Request test configuration is invalid.",
                Errors =
                [
                    new ApiError
                    {
                        Code = "validation_error",
                        Message = result.ErrorMessage ?? "Request test configuration is invalid."
                    }
                ],
                CorrelationId = HttpContext.TraceIdentifier
            }, 400);
        }

        return CreateJsonResponse(new ApiResponse<StepRequestTestResult>
        {
            Success = true,
            Message = "Request test completed.",
            Data = result.Value,
            CorrelationId = HttpContext.TraceIdentifier
        });
    }

    private static JsonResult CreateJsonResponse(object value, int statusCode = 200)
    {
        return new JsonResult(value, CamelCaseJsonOptions)
        {
            StatusCode = statusCode
        };
    }
}