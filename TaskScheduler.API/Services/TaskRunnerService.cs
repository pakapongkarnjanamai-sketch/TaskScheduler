using Microsoft.EntityFrameworkCore;
using TaskScheduler.Core.Models;
using TaskScheduler.Data;

namespace TaskScheduler.API.Services
{
    public class TaskRunnerService
    {
        private readonly TaskSchedulerDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<TaskRunnerService> _logger;

        public TaskRunnerService(TaskSchedulerDbContext context, IHttpClientFactory httpClientFactory, ILogger<TaskRunnerService> logger)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task RunTask(int triggerId)
        {
            // ✅ 1. กำหนดเวลาปัจจุบันเป็น Thai Time
            var thaiNow = DateTime.UtcNow.AddHours(7);

            var trigger = await _context.TaskTriggers
                .Include(t => t.Task)
                .FirstOrDefaultAsync(t => t.Id == triggerId);

            if (trigger == null || trigger.Task == null) return;

            // บันทึก Log การเริ่มทำงาน
            var executionLog = new TaskExecutionLog
            {
                TaskId = trigger.TaskId,
                TriggerId = trigger.Id,
                StartTime = thaiNow, // ✅ เวลาไทย
                Status = "Running"
            };

            _context.TaskExecutionLogs.Add(executionLog);
            await _context.SaveChangesAsync();

            try
            {
                // --- ส่วนของการยิง API (Logic เดิม) ---
                var client = _httpClientFactory.CreateClient();
                var request = new HttpRequestMessage
                {
                    RequestUri = new Uri(trigger.Task.ApiUrl),
                    Method = new HttpMethod(trigger.Task.HttpMethod)
                };

                // Add Headers / Body logic here if needed...

                var response = await client.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                // อัปเดต Log เมื่อสำเร็จ
                executionLog.EndTime = DateTime.UtcNow.AddHours(7); // ✅ จบเวลาไทย
                executionLog.Status = response.IsSuccessStatusCode ? "Success" : "Failed";
                executionLog.ResponseMessage = $"Status: {response.StatusCode}, Content: {content}";
            }
            catch (Exception ex)
            {
                // อัปเดต Log เมื่อ Error
                executionLog.EndTime = DateTime.UtcNow.AddHours(7); // ✅ จบเวลาไทย
                executionLog.Status = "Error";
                executionLog.ResponseMessage = ex.Message;
                _logger.LogError(ex, $"Error running task {trigger.Task.Name}");
            }

            // ✅ 2. อัปเดต Trigger และคำนวณเวลาครั้งถัดไป (Logic เดียวกับ Controller)
            trigger.LastExecutionTime = thaiNow;
            CalculateNextRun(trigger, thaiNow);

            await _context.SaveChangesAsync();
        }

        private void CalculateNextRun(TaskTrigger trigger, DateTime thaiNow)
        {
            if (trigger.TriggerType == "Interval" && trigger.IntervalMinutes > 0)
            {
                // บวกนาทีจากเวลาปัจจุบัน (ไทย)
                trigger.NextExecutionTime = thaiNow.AddMinutes(trigger.IntervalMinutes.Value);
            }
            else if (trigger.TriggerType == "Daily" && trigger.StartTime.HasValue)
            {
                // หาวันที่ของเวลาปัจจุบัน + เวลาที่ตั้งไว้
                var todayRun = thaiNow.Date.Add(trigger.StartTime.Value);

                // ถ้าเวลาที่ตั้งไว้ ผ่านไปแล้วของวันนี้ ให้ตั้งเป็นพรุ่งนี้
                if (todayRun <= thaiNow)
                {
                    trigger.NextExecutionTime = todayRun.AddDays(1);
                }
                else
                {
                    // ถ้ายังไม่ถึงเวลานั้นของวันนี้ (กรณีแปลกๆ หรือ Manual Run)
                    trigger.NextExecutionTime = todayRun;
                }
            }
        }
    }
}