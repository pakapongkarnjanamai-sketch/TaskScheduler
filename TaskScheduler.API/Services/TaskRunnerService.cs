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

        public TaskRunnerService(
            TaskSchedulerDbContext context,
            IHttpClientFactory httpClientFactory,
            ILogger<TaskRunnerService> logger)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task ExecuteTaskAsync(int triggerId)
        {
            // 1. ดึงข้อมูล Trigger และ Task
            var trigger = await _context.TaskTriggers
                .Include(t => t.Task)
                .FirstOrDefaultAsync(t => t.Id == triggerId);

            if (trigger == null || trigger.Task == null || !trigger.IsActive || !trigger.Task.IsActive)
                return;

            var task = trigger.Task;
            _logger.LogInformation($"Executing Task: {task.Name}");

            var log = new TaskExecutionLog
            {
                TaskId = task.Id,
                ExecutedAt = DateTime.UtcNow,
                Status = "Running"
            };

            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            try
            {
                // 2. ยิง HTTP Request
                var client = _httpClientFactory.CreateClient();
                var request = new HttpRequestMessage(new HttpMethod(task.HttpMethod), task.ApiUrl);

                if (!string.IsNullOrEmpty(task.Headers))
                {
                    // Basic Header Parsing logic
                    var headers = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(task.Headers);
                    if (headers != null)
                    {
                        foreach (var h in headers) request.Headers.TryAddWithoutValidation(h.Key, h.Value);
                    }
                }

                if (!string.IsNullOrEmpty(task.Body) && (task.HttpMethod == "POST" || task.HttpMethod == "PUT"))
                {
                    request.Content = new StringContent(task.Body, System.Text.Encoding.UTF8, "application/json");
                }

                var response = await client.SendAsync(request);
                stopwatch.Stop();

                log.Status = response.IsSuccessStatusCode ? "Success" : "Failed";
                log.ResponseCode = (int)response.StatusCode;
                log.ResponseBody = await response.Content.ReadAsStringAsync();
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                log.Status = "Error";
                log.ErrorMessage = ex.Message;
                _logger.LogError(ex, $"Error executing task {task.Id}");
            }

            log.Duration = (int)stopwatch.ElapsedMilliseconds;

            // 3. บันทึก Log และอัปเดตเวลาครั้งถัดไป
            _context.TaskExecutionLogs.Add(log);

            trigger.LastExecutionTime = DateTime.UtcNow;

            // คำนวณเวลาถัดไปแบบง่ายๆ (Interval)
            if (trigger.IntervalMinutes.HasValue && trigger.IntervalMinutes > 0)
            {
                trigger.NextExecutionTime = DateTime.UtcNow.AddMinutes(trigger.IntervalMinutes.Value);
            }
            else
            {
                trigger.NextExecutionTime = null; // หยุดรันถ้าระบุเงื่อนไขไม่ครบ
            }

            await _context.SaveChangesAsync();
        }
    }
}