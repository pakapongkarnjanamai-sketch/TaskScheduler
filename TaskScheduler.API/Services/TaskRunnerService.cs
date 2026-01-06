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
            var now = DateTime.UtcNow.AddHours(7);

            // ✅ ตัดวินาทีและมิลลิวินาทีทิ้ง ให้เหลือแค่ระดับนาที
            var thaiNowMinute = new DateTime(now.Year, now.Month, now.Day, now.Hour, now.Minute, 0);

            var trigger = await _context.TaskTriggers
                .Include(t => t.Task)
                .FirstOrDefaultAsync(t => t.Id == triggerId);

            if (trigger == null || trigger.Task == null) return;

            // บันทึก Log การเริ่มทำงาน (เวลาแบบนาทีเป๊ะๆ)
            var executionLog = new TaskExecutionLog
            {
                TaskId = trigger.TaskId,
                TriggerId = trigger.Id,
                StartTime = thaiNowMinute, // ✅ ใช้เวลาที่ตัดวินาทีแล้ว
                Status = "Running"
            };

            _context.TaskExecutionLogs.Add(executionLog);
            await _context.SaveChangesAsync();

            try
            {
                var client = _httpClientFactory.CreateClient();
                var request = new HttpRequestMessage
                {
                    RequestUri = new Uri(trigger.Task.ApiUrl),
                    Method = new HttpMethod(trigger.Task.HttpMethod)
                };

                // (ส่วน Add Headers / Body ละไว้ตามเดิม)

                var response = await client.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                // ✅ คำนวณเวลาจบแบบตัดวินาที (เพื่อความสม่ำเสมอของข้อมูล)
                var endNow = DateTime.UtcNow.AddHours(7);
                var endNowMinute = new DateTime(endNow.Year, endNow.Month, endNow.Day, endNow.Hour, endNow.Minute, 0);

                executionLog.EndTime = endNowMinute;
                executionLog.Status = response.IsSuccessStatusCode ? "Success" : "Failed";
                executionLog.ResponseMessage = $"Status: {response.StatusCode}, Content: {content}";
            }
            catch (Exception ex)
            {
                var endNow = DateTime.UtcNow.AddHours(7);
                var endNowMinute = new DateTime(endNow.Year, endNow.Month, endNow.Day, endNow.Hour, endNow.Minute, 0);

                executionLog.EndTime = endNowMinute;
                executionLog.Status = "Error";
                executionLog.ResponseMessage = ex.Message;
                _logger.LogError(ex, $"Error running task {trigger.Task.Name}");
            }

            // ✅ อัปเดต Trigger ใช้เวลาแบบนาที
            trigger.LastExecutionTime = thaiNowMinute;
            CalculateNextRun(trigger, thaiNowMinute);

            await _context.SaveChangesAsync();
        }

        private void CalculateNextRun(TaskTrigger trigger, DateTime baseTime)
        {
            // baseTime ที่ส่งมาถูกตัดวินาทีแล้วจากข้างบน
            if (trigger.TriggerType == "Interval" && trigger.IntervalMinutes > 0)
            {
                trigger.NextExecutionTime = baseTime.AddMinutes(trigger.IntervalMinutes.Value);
            }
            else if (trigger.TriggerType == "Daily" && trigger.StartTime.HasValue)
            {
                // ตัดวินาทีออกจาก StartTime
                var start = trigger.StartTime.Value;
                var startClean = new TimeSpan(start.Hours, start.Minutes, 0);

                var todayRun = baseTime.Date.Add(startClean);

                if (todayRun <= baseTime)
                {
                    trigger.NextExecutionTime = todayRun.AddDays(1);
                }
                else
                {
                    trigger.NextExecutionTime = todayRun;
                }
            }
        }
    }
}