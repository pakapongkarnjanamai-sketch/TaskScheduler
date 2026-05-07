using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using TaskScheduler.API.Contracts;
using TaskScheduler.API.Contracts.Dashboard;
using TaskScheduler.API.Services;

namespace TaskScheduler.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public sealed class DashboardController : ControllerBase
{
    private static readonly JsonSerializerOptions CamelCaseJsonOptions = new(JsonSerializerDefaults.Web);

    private readonly DashboardQueryService _dashboardQueryService;

    public DashboardController(DashboardQueryService dashboardQueryService)
    {
        _dashboardQueryService = dashboardQueryService;
    }

    [HttpGet("Summary")]
    public async Task<IActionResult> Summary()
    {
        var data = await _dashboardQueryService.GetSummaryAsync(HttpContext.RequestAborted);

        return CreateJsonResponse(new ApiResponse<DashboardSummaryDto>
        {
            Success = true,
            Message = "Dashboard summary retrieved.",
            Data = data,
            CorrelationId = HttpContext.TraceIdentifier,
        });
    }

    private static JsonResult CreateJsonResponse(object value, int statusCode = 200)
    {
        return new JsonResult(value, CamelCaseJsonOptions)
        {
            StatusCode = statusCode,
        };
    }
}
