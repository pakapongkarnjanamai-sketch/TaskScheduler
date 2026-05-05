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
        private readonly ScheduleTimingService _scheduleTimingService;
        private readonly IHubContext<TaskHub> _hubContext; // เพิ่มตัวแปรสำหรับ SignalR

        public TaskRunnerService(
            TaskSchedulerDbContext context,
            IHttpClientFactory httpClientFactory,
            ILogger<TaskRunnerService> logger,
            ScheduleTimingService scheduleTimingService,
            IHubContext<TaskHub> hubContext) // Inject IHubContext เข้ามา
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _scheduleTimingService = scheduleTimingService;
            _hubContext = hubContext;
        }

        public async System.Threading.Tasks.Task RunTask(int triggerId)
        {
            var thaiNowMinute = _scheduleTimingService.GetCurrentBusinessMinute();

            var trigger = await _context.Schedules
                .Include(t => t.Task!)
                .ThenInclude(t => t.Steps)
                .FirstOrDefaultAsync(t => t.Id == triggerId);

            if (trigger == null || trigger.Task == null)
            {
                return;
            }

            if (!trigger.IsActive || !trigger.Task.IsActive)
            {
                _logger.LogWarning(
                    "Skipping trigger {TriggerId} because the schedule or task is inactive.",
                    triggerId);
                return;
            }

            var hasRunningExecution = await _context.TaskExecutionLogs.AnyAsync(log =>
                log.TriggerId == triggerId &&
                log.Status == "Running" &&
                log.EndTime == null);

            if (hasRunningExecution)
            {
                _logger.LogWarning(
                    "Skipping trigger {TriggerId} because an execution is already running.",
                    triggerId);
                return;
            }

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
                    var stepLog = new StepExecutionLog
                    {
                        TaskExecutionLogId = mainExecutionLog.Id,
                        StepName = step.Name,
                        Order = step.Order,
                        StartTime = _scheduleTimingService.GetCurrentBusinessTime(),
                        Status = "Running",
                        ResponseMessage = "Processing..."
                    };

                    _context.StepExecutionLogs.Add(stepLog);
                    await _context.SaveChangesAsync();

                    try
                    {
                        var request = StepHttpRequestFactory.Create(new StepHttpRequestDefinition
                        {
                            ApiUrl = step.ApiUrl,
                            HttpMethod = step.HttpMethod,
                            Headers = step.Headers,
                            Body = step.Body
                        });

                        var response = await client.SendAsync(request);
                        var content = await response.Content.ReadAsStringAsync();

                        var contentLog = content.Length > 1000 ? content.Substring(0, 1000) + "..." : content;

                        stepLog.EndTime = _scheduleTimingService.GetCurrentBusinessTime();
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
                        stepLog.EndTime = _scheduleTimingService.GetCurrentBusinessTime();
                        stepLog.Status = "Error";
                        stepLog.ResponseMessage = $"Exception: {stepEx.Message}";
                        await _context.SaveChangesAsync();

                        summaryBuilder.AppendLine($"Step {step.Order} ({step.Name}): Error - {stepEx.Message}");
                        break;
                    }
                }

                // 3. อัปเดตสถานะจบงานที่ Log แม่
                var endNow = _scheduleTimingService.GetCurrentBusinessMinute();
                mainExecutionLog.EndTime = endNow;
                mainExecutionLog.Status = allStepsSuccess ? "Success" : "Failed";
                mainExecutionLog.ResponseMessage = summaryBuilder.ToString();

            }
            catch (Exception ex)
            {
                var endNow = _scheduleTimingService.GetCurrentBusinessMinute();
                mainExecutionLog.EndTime = endNow;
                mainExecutionLog.Status = "Error";
                mainExecutionLog.ResponseMessage = $"Critical System Error: {ex.Message}";
                _logger.LogError(ex, $"Error running task {trigger.Task.Name}");
            }

            // คำนวณรอบถัดไป
            trigger.LastExecutionTime = thaiNowMinute;
            _scheduleTimingService.CalculateNextRun(trigger, thaiNowMinute);

            await _context.SaveChangesAsync();

            // [SignalR] แจ้ง Client ว่าจบงานแล้ว พร้อมส่งเวลา Next Run ใหม่ไปอัปเดต
            await _hubContext.Clients.All.SendAsync("ReceiveTaskUpdate", trigger.TaskId, new
            {
                LastStatus = mainExecutionLog.Status, // Success หรือ Failed หรือ Error
                LastExecutionTime = thaiNowMinute,
                NextExecutionTime = trigger.NextExecutionTime
            });
        }
    }
}