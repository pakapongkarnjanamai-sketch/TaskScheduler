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

            bool allStepsSuccess = true;
            var summaryBuilder = new StringBuilder(); // เก็บสรุปสั้นๆ ไว้ที่ตัวแม่ (ถ้าต้องการ)

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
                        TaskExecutionLogId = mainExecutionLog.Id, // ผูกกับ Log แม่
                        StepName = step.Name,
                        Order = step.Order,
                        StartTime = DateTime.UtcNow.AddHours(7),
                        Status = "Running",
                        ResponseMessage = "Processing..."
                    };

                    _context.TaskStepExecutionLogs.Add(stepLog);
                    await _context.SaveChangesAsync(); // Save สถานะเริ่ม Step

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

                        // ตัด Content ถ้าเวิ่นเว้อเกินไป
                        var contentLog = content.Length > 1000 ? content.Substring(0, 1000) + "..." : content;

                        // ✅ อัปเดตผลลัพธ์ลงใน Step Log ตัวเดิม (แยกเก็บเป็น Record ของใครของมัน)
                        stepLog.EndTime = DateTime.UtcNow.AddHours(7);
                        stepLog.Status = response.IsSuccessStatusCode ? "Success" : "Failed";
                        stepLog.ResponseMessage = $"Status: {response.StatusCode}\nResponse: {contentLog}";

                        await _context.SaveChangesAsync(); // Save จบ Step

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

                        // บันทึก Error ลงใน Step Log
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
                mainExecutionLog.ResponseMessage = summaryBuilder.ToString(); // เก็บแค่สรุปย่อๆ

            }
            catch (Exception ex)
            {
                var endNow = DateTime.UtcNow.AddHours(7);
                mainExecutionLog.EndTime = new DateTime(endNow.Year, endNow.Month, endNow.Day, endNow.Hour, endNow.Minute, 0);
                mainExecutionLog.Status = "Error";
                mainExecutionLog.ResponseMessage = $"Critical System Error: {ex.Message}";
                _logger.LogError(ex, $"Error running task {trigger.Task.Name}");
            }

            trigger.LastExecutionTime = thaiNowMinute;
            CalculateNextRun(trigger, thaiNowMinute);

            await _context.SaveChangesAsync();
        }

        private void CalculateNextRun(TaskTrigger trigger, DateTime baseTime)
        {
            // Logic เดิม
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