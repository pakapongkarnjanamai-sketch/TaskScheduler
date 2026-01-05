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
    public class TaskTriggersController : ControllerBase
    {
        private readonly TaskSchedulerDbContext _context;

        public TaskTriggersController(TaskSchedulerDbContext context)
        {
            _context = context;
        }

        // URL: api/TaskTriggers/Get?taskId=...
        [HttpGet("Get")]
        public object Get(int taskId, DataSourceLoadOptions loadOptions)
        {
            // Filter ตาม TaskId ที่ส่งมาจาก loadParams ของ Client
            var source = _context.TaskTriggers
                .Where(t => t.TaskId == taskId);

            return DataSourceLoader.Load(source, loadOptions);
        }

        // URL: api/TaskTriggers/Post
        [HttpPost("Post")]
        public async Task<IActionResult> Post([FromForm] string values)
        {
            var trigger = new TaskTrigger();
            JsonConvert.PopulateObject(values, trigger);

            if (!TryValidateModel(trigger))
                return BadRequest(ModelState);

            // ✅ คำนวณเวลาครั้งถัดไปทันทีที่สร้าง
            CalculateNextRun(trigger);

            _context.TaskTriggers.Add(trigger);
            await _context.SaveChangesAsync();

            return Ok(trigger);
        }

        // URL: api/TaskTriggers/Put
        [HttpPut("Put")]
        public async Task<IActionResult> Put([FromForm] int key, [FromForm] string values)
        {
            var trigger = await _context.TaskTriggers.FindAsync(key);
            if (trigger == null)
                return NotFound();

            JsonConvert.PopulateObject(values, trigger);

            if (!TryValidateModel(trigger))
                return BadRequest(ModelState);

            // ✅ คำนวณเวลาใหม่เมื่อมีการแก้ไข
            CalculateNextRun(trigger);

            await _context.SaveChangesAsync();

            return Ok(trigger);
        }

        // URL: api/TaskTriggers/Delete
        [HttpDelete("Delete")]
        public async Task<IActionResult> Delete([FromForm] int key)
        {
            var trigger = await _context.TaskTriggers.FindAsync(key);
            if (trigger == null)
                return NotFound();

            _context.TaskTriggers.Remove(trigger);
            await _context.SaveChangesAsync();

            return Ok();
        }

        // 🟢 Logic คำนวณเวลา Next Run (คงไว้ตามเดิม)
        private void CalculateNextRun(TaskTrigger trigger)
        {
            // กำหนดเวลาปัจจุบัน (สมมติว่าเป็นเวลาไทย UTC+7)
            var now = DateTime.UtcNow.AddHours(7);

            if (trigger.TriggerType == "Interval" && trigger.IntervalMinutes > 0)
            {
                // ถ้าแก้ไข Interval ให้เริ่มนับใหม่จากปัจจุบัน
                trigger.NextExecutionTime = now.AddMinutes(trigger.IntervalMinutes.Value);
            }
            else if (trigger.TriggerType == "Daily" && trigger.StartTime.HasValue)
            {
                var todayRun = now.Date.Add(trigger.StartTime.Value);
                trigger.NextExecutionTime = (todayRun > now) ? todayRun : todayRun.AddDays(1);
            }
        }
    }
}