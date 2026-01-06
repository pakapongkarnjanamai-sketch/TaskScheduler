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
        public object Get(DataSourceLoadOptions loadOptions)
        {
     
            var source = _context.TaskTriggers.AsQueryable();

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

        // 🟢 Logic คำนวณเวลา Next Run (ระดับนาที)
        private void CalculateNextRun(TaskTrigger trigger)
        {
            var now = DateTime.UtcNow.AddHours(7);

            // ✅ ตัดวินาทีและมิลลิวินาทีทิ้ง ให้เหลือแค่ระดับนาที
            var nowMinute = new DateTime(now.Year, now.Month, now.Day, now.Hour, now.Minute, 0);

            if (trigger.TriggerType == "Interval" && trigger.IntervalMinutes > 0)
            {
                // บวกนาทีจากเวลาปัจจุบันที่ตัดวินาทีแล้ว
                trigger.NextExecutionTime = nowMinute.AddMinutes(trigger.IntervalMinutes.Value);
            }
            else if (trigger.TriggerType == "Daily" && trigger.StartTime.HasValue)
            {
                // ตัดวินาทีออกจาก StartTime ของ Trigger ด้วย (เช่น 10:30:45 -> 10:30:00)
                var start = trigger.StartTime.Value;
                var startClean = new TimeSpan(start.Hours, start.Minutes, 0);

                var todayRun = nowMinute.Date.Add(startClean);

                // ถ้าเวลาที่ตั้งไว้ ผ่านไปแล้วของวันนี้ ให้ตั้งเป็นพรุ่งนี้
                trigger.NextExecutionTime = (todayRun > nowMinute) ? todayRun : todayRun.AddDays(1);
            }
        }
    }
}