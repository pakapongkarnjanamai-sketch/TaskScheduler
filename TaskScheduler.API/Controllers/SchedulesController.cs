using DevExtreme.AspNet.Data;
using DevExtreme.AspNet.Mvc;
using Microsoft.AspNetCore.Mvc;
using TaskScheduler.API.Services;

namespace TaskScheduler.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SchedulesController : Controller
    {
        private readonly ScheduleAdminService _scheduleAdminService;

        public SchedulesController(ScheduleAdminService scheduleAdminService)
        {
            _scheduleAdminService = scheduleAdminService;
        }

        [HttpGet("Get")]
        public async System.Threading.Tasks.Task<object> Get(DataSourceLoadOptions loadOptions)
        {
            return await _scheduleAdminService.GetAsync(loadOptions, HttpContext.RequestAborted);
        }

        [HttpPost("Post")]
        public async System.Threading.Tasks.Task<IActionResult> Post([FromForm] string values)
        {
            var result = await _scheduleAdminService.CreateAsync(values, HttpContext.RequestAborted);
            if (!result.IsSuccess)
                return BadRequest(result.ErrorMessage);

            return Json(new { result.Value!.Id });
        }

        [HttpPut("Put")]
        public async System.Threading.Tasks.Task<IActionResult> Put([FromForm] int key, [FromForm] string values)
        {
            var result = await _scheduleAdminService.UpdateAsync(key, values, HttpContext.RequestAborted);
            if (result.IsNotFound)
                return StatusCode(409, "Object not found");
            if (!result.IsSuccess)
                return BadRequest(result.ErrorMessage);

            return Ok();
        }

        [HttpDelete("Delete")]
        public async System.Threading.Tasks.Task<IActionResult> Delete([FromForm] int key)
        {
            await _scheduleAdminService.DeleteAsync(key, HttpContext.RequestAborted);
            return Ok();
        }
    }
}