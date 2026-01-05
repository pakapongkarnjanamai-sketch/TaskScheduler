using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskScheduler.Core.Models;
using TaskScheduler.Data;

namespace TaskScheduler.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TaskTriggersController : ControllerBase
    {
        private readonly TaskSchedulerDbContext _context;

        public TaskTriggersController(TaskSchedulerDbContext context)
        {
            _context = context;
        }

        // GET: api/TaskTriggers?taskId=1
        [HttpGet]
        public async Task<IActionResult> Get(int taskId, CancellationToken ct)
        {
            var triggers = await _context.TaskTriggers
                .Where(t => t.TaskId == taskId)
                .ToListAsync(ct);
            return Ok(triggers);
        }

        // POST: api/TaskTriggers
        [HttpPost]
        public async Task<IActionResult> Post(TaskTrigger trigger, CancellationToken ct)
        {
            // ✅ คำนวณเวลาครั้งถัดไปทันทีที่สร้าง
            CalculateNextRun(trigger);

            _context.TaskTriggers.Add(trigger);
            await _context.SaveChangesAsync(ct);
            return Ok(trigger);
        }

        // PUT: api/TaskTriggers/5
        [HttpPut("{id}")]
        public async Task<IActionResult> Put(int id, TaskTrigger trigger, CancellationToken ct)
        {
            var existing = await _context.TaskTriggers.FindAsync(new object[] { id }, ct);
            if (existing == null) return NotFound();

            // อัปเดตค่า
            existing.TriggerType = trigger.TriggerType;
            existing.IntervalMinutes = trigger.IntervalMinutes;
            existing.StartTime = trigger.StartTime;
            existing.IsActive = trigger.IsActive;

            // ✅ คำนวณเวลาใหม่
            CalculateNextRun(existing);

            await _context.SaveChangesAsync(ct);
            return Ok(existing);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var existing = await _context.TaskTriggers.FindAsync(new object[] { id }, ct);
            if (existing != null)
            {
                _context.TaskTriggers.Remove(existing);
                await _context.SaveChangesAsync(ct);
            }
            return Ok();
        }

        // 🟢 Logic คำนวณเวลา Next Run
        private void CalculateNextRun(TaskTrigger trigger)
        {
            // กำหนดเวลาปัจจุบัน (สมมติว่าเป็นเวลาไทย UTC+7)
            var now = DateTime.UtcNow.AddHours(7);

            if (trigger.TriggerType == "Interval" && trigger.IntervalMinutes > 0)
            {
                // ✅ แก้ไข: ใช้ now แทน DateTime.UtcNow
                trigger.NextExecutionTime = now.AddMinutes(trigger.IntervalMinutes.Value);
            }
            else if (trigger.TriggerType == "Daily" && trigger.StartTime.HasValue)
            {
                // ✅ แก้ไข: ใช้ now.Date เพื่อให้ได้วันที่ตามเวลาไทย
                var todayRun = now.Date.Add(trigger.StartTime.Value);

                // ✅ แก้ไข: เปรียบเทียบกับ now
                trigger.NextExecutionTime = (todayRun > now) ? todayRun : todayRun.AddDays(1);
            }
        }
    }
}