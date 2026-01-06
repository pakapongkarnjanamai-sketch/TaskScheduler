using Microsoft.EntityFrameworkCore;
using System.Text;
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
            var thaiNowMinute = new DateTime(now.Year, now.Month, now.Day, now.Hour, now.Minute, 0);

            // ✅ Include Steps เข้ามาด้วย
            var trigger = await _context.TaskTriggers
                .Include(t => t.Task)
                .ThenInclude(t => t.Steps)
                .FirstOrDefaultAsync(t => t.Id == triggerId);

            if (trigger == null || trigger.Task == null) return;

            var executionLog = new TaskExecutionLog
            {
                TaskId = trigger.TaskId,
                TriggerId = trigger.Id,
                StartTime = thaiNowMinute,
                Status = "Running"
            };

            _context.TaskExecutionLogs.Add(executionLog);
            await _context.SaveChangesAsync();

            var logMessageBuilder = new StringBuilder(); // เอาไว้เก็บ Log ของแต่ละ Step รวมกัน
            bool allStepsSuccess = true;

            try
            {
                // ✅ เรียงลำดับ Step ตาม Order
                var steps = trigger.Task.Steps.OrderBy(s => s.Order).ToList();

                if (!steps.Any())
                {
                    logMessageBuilder.AppendLine("No steps defined for this task.");
                }

                var client = _httpClientFactory.CreateClient();

                foreach (var step in steps)
                {
                    logMessageBuilder.AppendLine($"--- Step {step.Order}: {step.Name} ---");

                    try
                    {
                        var request = new HttpRequestMessage
                        {
                            RequestUri = new Uri(step.ApiUrl),
                            Method = new HttpMethod(step.HttpMethod)
                        };

                        // ใส่ Logic Add Headers / Body ตรงนี้ (ถ้ามี)
                        if (!string.IsNullOrEmpty(step.Body) && (step.HttpMethod == "POST" || step.HttpMethod == "PUT"))
                        {
                            request.Content = new StringContent(step.Body, Encoding.UTF8, "application/json");
                        }

                        // TODO: Parse Headers string -> headers dictionary if needed

                        var response = await client.SendAsync(request);
                        var content = await response.Content.ReadAsStringAsync();

                        logMessageBuilder.AppendLine($"Status: {response.StatusCode}");
                        // ตัด Content ให้สั้นลงหน่อยถ้ามันยาวเกินไป เพื่อไม่ให้ Log บวม
                        var contentLog = content.Length > 500 ? content.Substring(0, 500) + "..." : content;
                        logMessageBuilder.AppendLine($"Response: {contentLog}");

                        if (!response.IsSuccessStatusCode)
                        {
                            allStepsSuccess = false;
                            logMessageBuilder.AppendLine(">> Step Failed. Stopping sequence.");
                            break; // ❌ ถ้า Step นี้พัง ให้หยุดทำ Step ต่อไปทันที (หรือจะเอาออกถ้าอยากให้ทำต่อ)
                        }
                    }
                    catch (Exception stepEx)
                    {
                        allStepsSuccess = false;
                        logMessageBuilder.AppendLine($"Exception in step: {stepEx.Message}");
                        break;
                    }
                }

                var endNow = DateTime.UtcNow.AddHours(7);
                executionLog.EndTime = new DateTime(endNow.Year, endNow.Month, endNow.Day, endNow.Hour, endNow.Minute, 0);
                executionLog.Status = allStepsSuccess ? "Success" : "Failed";
                executionLog.ResponseMessage = logMessageBuilder.ToString();

            }
            catch (Exception ex)
            {
                var endNow = DateTime.UtcNow.AddHours(7);
                executionLog.EndTime = new DateTime(endNow.Year, endNow.Month, endNow.Day, endNow.Hour, endNow.Minute, 0);
                executionLog.Status = "Error";
                executionLog.ResponseMessage = $"Critical Error: {ex.Message} \nDetails: {logMessageBuilder}";
                _logger.LogError(ex, $"Error running task {trigger.Task.Name}");
            }

            trigger.LastExecutionTime = thaiNowMinute;
            CalculateNextRun(trigger, thaiNowMinute);

            await _context.SaveChangesAsync();
        }


        private void CalculateNextRun(TaskTrigger trigger, DateTime baseTime)
        {
            // (คงโค้ดเดิมไว้)
            if (trigger.TriggerType == "Interval" && trigger.IntervalMinutes > 0)
            {
                trigger.NextExecutionTime = baseTime.AddMinutes(trigger.IntervalMinutes.Value);
            }
            else if (trigger.TriggerType == "Daily" && trigger.StartTime.HasValue)
            {
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