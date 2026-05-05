using DevExtreme.AspNet.Data;
using DevExtreme.AspNet.Mvc;
using Microsoft.AspNetCore.Mvc;
using TaskScheduler.API.Services;

namespace TaskScheduler.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StepsController : ControllerBase
    {
        private readonly StepAdminService _stepAdminService;

        public StepsController(StepAdminService stepAdminService)
        {
            _stepAdminService = stepAdminService;
        }

        // GET: api/Steps/Get
        [HttpGet("Get")]
        public async Task<object> Get(DataSourceLoadOptions loadOptions)
        {
            return await _stepAdminService.GetAsync(loadOptions, HttpContext.RequestAborted);
        }

        // POST: api/Steps/Post
        [HttpPost("Post")]
        public async Task<IActionResult> Post([FromForm] string values)
        {
            var result = await _stepAdminService.CreateAsync(values, HttpContext.RequestAborted);
            if (!result.IsSuccess)
                return BadRequest(result.ErrorMessage);

            return Ok(result.Value);
        }

        // PUT: api/Steps/Put
        [HttpPut("Put")]
        public async Task<IActionResult> Put([FromForm] int key, [FromForm] string values)
        {
            var result = await _stepAdminService.UpdateAsync(key, values, HttpContext.RequestAborted);
            if (result.IsNotFound)
                return StatusCode(409, "Step not found");
            if (!result.IsSuccess)
                return BadRequest(result.ErrorMessage);

            return Ok(result.Value);
        }

        // DELETE: api/Steps/Delete
        [HttpDelete("Delete")]
        public async Task<IActionResult> Delete([FromForm] int key)
        {
            var deleted = await _stepAdminService.DeleteAsync(key, HttpContext.RequestAborted);
            if (!deleted)
                return StatusCode(409, "Step not found");

            return Ok();
        }
    }
}