using DevExtreme.AspNet.Data;
using DevExtreme.AspNet.Mvc;
using Microsoft.AspNetCore.Mvc;
using TaskScheduler.API.Services;

namespace TaskScheduler.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TaskExecutionLogsController : ControllerBase
    {
        private readonly ExecutionLogQueryService _executionLogQueryService;

        public TaskExecutionLogsController(ExecutionLogQueryService executionLogQueryService)
        {
            _executionLogQueryService = executionLogQueryService;
        }

        // GET: api/TaskExecutionLogs/Get
        [HttpGet("Get")]
        public async Task<object> Get(DataSourceLoadOptions loadOptions)
        {
            return await _executionLogQueryService.GetTaskExecutionLogsAsync(loadOptions, HttpContext.RequestAborted);
        }
    }
}