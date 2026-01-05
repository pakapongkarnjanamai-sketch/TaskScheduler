using DevExtreme.AspNet.Data;
using DevExtreme.AspNet.Mvc;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using TaskScheduler.Core.Models;
using TaskScheduler.Data;

namespace TaskScheduler.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TasksController : ControllerBase
    {
        private readonly TaskSchedulerDbContext _context;

        public TasksController(TaskSchedulerDbContext context)
        {
            _context = context;
        }

        // URL: api/Tasks/Get
        [HttpGet("Get")]
        public async Task<object> Get(DataSourceLoadOptions loadOptions)
        {
            // ใช้ DataSourceLoader เพื่อจัดการ filter/sort/page จาก Grid
            // ไม่จำเป็นต้อง Include Triggers เพราะ Client ใช้ Master-Detail โหลดแยกต่างหาก
            var source = _context.Tasks.AsNoTracking();

            return DataSourceLoader.Load(source, loadOptions);
        }

        // URL: api/Tasks/Post
        [HttpPost("Post")]
        public async Task<IActionResult> Post([FromForm] string values)
        {
            var task = new ScheduledTask();
            JsonConvert.PopulateObject(values, task);

            if (!TryValidateModel(task))
                return BadRequest(ModelState);

            // Set default values if needed
            // task.CreatedDate = DateTime.UtcNow;

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            return Ok(task);
        }

        // URL: api/Tasks/Put
        [HttpPut("Put")]
        public async Task<IActionResult> Put([FromForm] int key, [FromForm] string values)
        {
            var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == key);
            if (task == null)
                return NotFound();

            JsonConvert.PopulateObject(values, task);

            if (!TryValidateModel(task))
                return BadRequest(ModelState);

            // task.ModifiedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(task);
        }

        // URL: api/Tasks/Delete
        [HttpDelete("Delete")]
        public async Task<IActionResult> Delete([FromForm] int key)
        {
            var task = await _context.Tasks.FindAsync(key);
            if (task == null)
                return NotFound();

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}