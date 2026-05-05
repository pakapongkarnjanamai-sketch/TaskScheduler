using DevExtreme.AspNet.Data;
using DevExtreme.AspNet.Mvc;
using Microsoft.AspNetCore.Mvc;
using TaskScheduler.API.Services;

namespace TaskScheduler.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StepExecutionLogsController : ControllerBase
    {
        private readonly ExecutionLogQueryService _executionLogQueryService;

        public StepExecutionLogsController(ExecutionLogQueryService executionLogQueryService)
        {
            _executionLogQueryService = executionLogQueryService;
        }

        [HttpGet("Get")]
        public async Task<object> Get(DataSourceLoadOptions loadOptions)
        {
            return await _executionLogQueryService.GetStepExecutionLogsAsync(loadOptions, HttpContext.RequestAborted);
        }
    }
}