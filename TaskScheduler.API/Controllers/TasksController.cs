using DevExtreme.AspNet.Data;
using DevExtreme.AspNet.Mvc;
using Microsoft.AspNetCore.Mvc;
using TaskScheduler.API.Services;

namespace TaskScheduler.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TasksController : ControllerBase
    {
        private readonly TaskAdminService _taskAdminService;

        public TasksController(TaskAdminService taskAdminService)
        {
            _taskAdminService = taskAdminService;
        }

        // URL: api/Tasks/Get
        [HttpGet("Get")]
        public async Task<object> Get(DataSourceLoadOptions loadOptions)
        {
            return await _taskAdminService.GetAsync(loadOptions, HttpContext.RequestAborted);
        }

        // URL: api/Tasks/Post
        [HttpPost("Post")]
        public async Task<IActionResult> Post([FromForm] string values)
        {
            var result = await _taskAdminService.CreateAsync(values, HttpContext.RequestAborted);
            if (!result.IsSuccess)
                return BadRequest(result.ErrorMessage);

            return Ok(result.Value);
        }

        // URL: api/Tasks/Put
        [HttpPut("Put")]
        public async Task<IActionResult> Put([FromForm] int key, [FromForm] string values)
        {
            var result = await _taskAdminService.UpdateAsync(key, values, HttpContext.RequestAborted);
            if (result.IsNotFound)
                return NotFound();
            if (!result.IsSuccess)
                return BadRequest(result.ErrorMessage);

            return Ok(result.Value);
        }

        // URL: api/Tasks/Delete
        [HttpDelete("Delete")]
        public async Task<IActionResult> Delete([FromForm] int key)
        {
            var deleted = await _taskAdminService.DeleteAsync(key, HttpContext.RequestAborted);
            if (!deleted)
                return NotFound();

            return Ok();
        }
    }
}