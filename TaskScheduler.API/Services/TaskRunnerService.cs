using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Text;
using TaskScheduler.API.Hubs;
using TaskScheduler.Core.Models;
using TaskScheduler.Data;

namespace TaskScheduler.API.Services
{
    public class TaskRunnerService
    {
        private readonly TaskSchedulerDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<TaskRunnerService> _logger;
        private readonly IHubContext<TaskHub> _hubContext; // เพิ่มตัวแปรสำหรับ SignalR

        public TaskRunnerService(
            TaskSchedulerDbContext context,
            IHttpClientFactory httpClientFactory,
            ILogger<TaskRunnerService> logger,
            IHubContext<TaskHub> hubContext) // Inject IHubContext เข้ามา
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _hubContext = hubContext;
        }

        public async Task RunTask(int triggerId)
        {
            var now = DateTime.UtcNow.AddHours(7);
            var thaiNowMinute = new DateTime(now.Year, now.Month, now.Day, now.Hour, now.Minute, 0);

            var trigger = await _context.TaskTriggers
                .Include(t => t.Task)
                .ThenInclude(t => t.Steps)
                .FirstOrDefaultAsync(t => t.Id == triggerId);

            if (trigger == null || trigger.Task == null) return;

            // 1. สร้าง Log หลัก (Parent) สถานะ "Running"
            var mainExecutionLog = new TaskExecutionLog
            {
                TaskId = trigger.TaskId,
                TriggerId = trigger.Id,
                StartTime = thaiNowMinute,
                Status = "Running",
                ResponseMessage = "Task Started..."
            };

            _context.TaskExecutionLogs.Add(mainExecutionLog);
            await _context.SaveChangesAsync(); // Save เพื่อให้ได้ mainExecutionLog.Id มาใช้ต่อ

            // [SignalR] แจ้ง Client ว่าเริ่มทำงานแล้ว (Status: Running)
            await _hubContext.Clients.All.SendAsync("ReceiveTaskUpdate", trigger.TaskId, new
            {
                LastStatus = "Running",
                LastExecutionTime = thaiNowMinute
            });

            bool allStepsSuccess = true;
            var summaryBuilder = new StringBuilder();

            try
            {
                var steps = trigger.Task.Steps.OrderBy(s => s.Order).ToList();
                var client = _httpClientFactory.CreateClient();

                if (!steps.Any())
                {
                    mainExecutionLog.ResponseMessage = "No steps defined.";
                    summaryBuilder.AppendLine("No steps defined.");
                }

                foreach (var step in steps)
                {
                    // 2. สร้าง Log ของ Step (Child)
                    var stepLog = new TaskStepExecutionLog
                    {
                        TaskExecutionLogId = mainExecutionLog.Id,
                        StepName = step.Name,
                        Order = step.Order,
                        StartTime = DateTime.UtcNow.AddHours(7),
                        Status = "Running",
                        ResponseMessage = "Processing..."
                    };

                    _context.TaskStepExecutionLogs.Add(stepLog);
                    await _context.SaveChangesAsync();

                    try
                    {
                        var request = new HttpRequestMessage
                        {
                            RequestUri = new Uri(step.ApiUrl),
                            Method = new HttpMethod(step.HttpMethod)
                        };

                        if (!string.IsNullOrEmpty(step.Body) && (step.HttpMethod == "POST" || step.HttpMethod == "PUT"))
                        {
                            request.Content = new StringContent(step.Body, Encoding.UTF8, "application/json");
                        }

                        var response = await client.SendAsync(request);
                        var content = await response.Content.ReadAsStringAsync();

                        var contentLog = content.Length > 1000 ? content.Substring(0, 1000) + "..." : content;

                        stepLog.EndTime = DateTime.UtcNow.AddHours(7);
                        stepLog.Status = response.IsSuccessStatusCode ? "Success" : "Failed";
                        stepLog.ResponseMessage = $"Status: {response.StatusCode}\nResponse: {contentLog}";

                        await _context.SaveChangesAsync();

                        if (!response.IsSuccessStatusCode)
                        {
                            allStepsSuccess = false;
                            summaryBuilder.AppendLine($"Step {step.Order} ({step.Name}): Failed");
                            break;
                        }
                        else
                        {
                            summaryBuilder.AppendLine($"Step {step.Order} ({step.Name}): Success");
                        }
                    }
                    catch (Exception stepEx)
                    {
                        allStepsSuccess = false;
                        stepLog.EndTime = DateTime.UtcNow.AddHours(7);
                        stepLog.Status = "Error";
                        stepLog.ResponseMessage = $"Exception: {stepEx.Message}";
                        await _context.SaveChangesAsync();

                        summaryBuilder.AppendLine($"Step {step.Order} ({step.Name}): Error - {stepEx.Message}");
                        break;
                    }
                }

                // 3. อัปเดตสถานะจบงานที่ Log แม่
                var endNow = DateTime.UtcNow.AddHours(7);
                mainExecutionLog.EndTime = new DateTime(endNow.Year, endNow.Month, endNow.Day, endNow.Hour, endNow.Minute, 0);
                mainExecutionLog.Status = allStepsSuccess ? "Success" : "Failed";
                mainExecutionLog.ResponseMessage = summaryBuilder.ToString();

            }
            catch (Exception ex)
            {
                var endNow = DateTime.UtcNow.AddHours(7);
                mainExecutionLog.EndTime = new DateTime(endNow.Year, endNow.Month, endNow.Day, endNow.Hour, endNow.Minute, 0);
                mainExecutionLog.Status = "Error";
                mainExecutionLog.ResponseMessage = $"Critical System Error: {ex.Message}";
                _logger.LogError(ex, $"Error running task {trigger.Task.Name}");
            }

            // คำนวณรอบถัดไป
            trigger.LastExecutionTime = thaiNowMinute;
            CalculateNextRun(trigger, thaiNowMinute);

            await _context.SaveChangesAsync();

            // [SignalR] แจ้ง Client ว่าจบงานแล้ว พร้อมส่งเวลา Next Run ใหม่ไปอัปเดต
            await _hubContext.Clients.All.SendAsync("ReceiveTaskUpdate", trigger.TaskId, new
            {
                LastStatus = mainExecutionLog.Status, // Success หรือ Failed หรือ Error
                LastExecutionTime = thaiNowMinute,
                NextExecutionTime = trigger.NextExecutionTime
            });
        }

        private void CalculateNextRun(TaskTrigger trigger, DateTime baseTime)
        {
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