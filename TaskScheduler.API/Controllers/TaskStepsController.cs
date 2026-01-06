using DevExtreme.AspNet.Data;
using DevExtreme.AspNet.Mvc;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json; // จำเป็นสำหรับการแปลงข้อมูลจาก DevExtreme
using TaskScheduler.Core.Models;
using TaskScheduler.Data;

namespace TaskScheduler.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TaskStepsController : ControllerBase
    {
        private readonly TaskSchedulerDbContext _context;

        public TaskStepsController(TaskSchedulerDbContext context)
        {
            _context = context;
        }

        // GET: api/TaskSteps/Get
        [HttpGet("Get")]
        public async Task<object> Get(DataSourceLoadOptions loadOptions)
        {
            // ใช้ DataSourceLoader เพื่อรองรับการ Filter, Sort, Page จาก Frontend โดยอัตโนมัติ
            // Frontend จะส่ง Filter TaskId มาให้เองผ่าน loadOptions
            return DataSourceLoader.Load(_context.TaskSteps, loadOptions);
        }

        // POST: api/TaskSteps/Post
        [HttpPost("Post")]
        public async Task<IActionResult> Post([FromForm] string values)
        {
            var newStep = new TaskStep();

            // แปลง JSON string เป็น Object
            JsonConvert.PopulateObject(values, newStep);

            if (!TryValidateModel(newStep))
                return BadRequest(ModelState);

            _context.TaskSteps.Add(newStep);
            await _context.SaveChangesAsync();

            return Ok(newStep);
        }

        // PUT: api/TaskSteps/Put
        [HttpPut("Put")]
        public async Task<IActionResult> Put([FromForm] int key, [FromForm] string values)
        {
            var step = await _context.TaskSteps.FindAsync(key);
            if (step == null)
                return StatusCode(409, "TaskStep not found");

            // อัปเดตข้อมูลเฉพาะ field ที่มีการเปลี่ยนแปลง
            JsonConvert.PopulateObject(values, step);

            if (!TryValidateModel(step))
                return BadRequest(ModelState);

            await _context.SaveChangesAsync();

            return Ok(step);
        }

        // DELETE: api/TaskSteps/Delete
        [HttpDelete("Delete")]
        public async Task<IActionResult> Delete([FromForm] int key)
        {
            var step = await _context.TaskSteps.FindAsync(key);
            if (step == null)
                return StatusCode(409, "TaskStep not found");

            _context.TaskSteps.Remove(step);
            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}