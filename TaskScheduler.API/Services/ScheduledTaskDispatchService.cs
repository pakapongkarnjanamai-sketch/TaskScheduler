using Microsoft.EntityFrameworkCore;
using TaskScheduler.Data;

namespace TaskScheduler.API.Services;

public class ScheduledTaskDispatchService
{
    private readonly TaskSchedulerDbContext _context;
    private readonly TaskRunnerService _taskRunnerService;
    private readonly ScheduleTimingService _scheduleTimingService;
    private readonly ILogger<ScheduledTaskDispatchService> _logger;

    public ScheduledTaskDispatchService(
        TaskSchedulerDbContext context,
        TaskRunnerService taskRunnerService,
        ScheduleTimingService scheduleTimingService,
        ILogger<ScheduledTaskDispatchService> logger)
    {
        _context = context;
        _taskRunnerService = taskRunnerService;
        _scheduleTimingService = scheduleTimingService;
        _logger = logger;
    }

    public async Task RunDueSchedulesAsync(CancellationToken cancellationToken = default)
    {
        var businessMinute = _scheduleTimingService.GetCurrentBusinessMinute();

        var dueTriggerIds = await _context.Schedules
            .AsNoTracking()
            .Where(schedule =>
                schedule.IsActive &&
                schedule.Task != null &&
                schedule.Task.IsActive &&
                schedule.NextExecutionTime.HasValue &&
                schedule.NextExecutionTime <= businessMinute)
            .Select(schedule => schedule.Id)
            .ToListAsync(cancellationToken);

        if (!dueTriggerIds.Any())
        {
            return;
        }

        _logger.LogInformation("[{BusinessMinute:HH:mm:ss}] Found {DueScheduleCount} schedules to run.", businessMinute, dueTriggerIds.Count);

        foreach (var triggerId in dueTriggerIds)
        {
            await _taskRunnerService.RunTask(triggerId);
        }
    }
}