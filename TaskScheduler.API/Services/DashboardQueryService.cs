using Microsoft.EntityFrameworkCore;
using TaskScheduler.API.Contracts.Dashboard;
using TaskScheduler.Data;
using TaskScheduler.Data.Services;

namespace TaskScheduler.API.Services;

public sealed class DashboardQueryService
{
    private readonly TaskSchedulerDbContext _context;
    private readonly IDateTime _dateTime;

    public DashboardQueryService(TaskSchedulerDbContext context, IDateTime dateTime)
    {
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        var now = _dateTime.Now;

        var tasks = await _context.Tasks
            .AsNoTracking()
            .Select(task => new TaskSnapshot
            {
                Id = task.Id,
                Name = task.Name,
                IsActive = task.IsActive,
                LastStatus = _context.TaskExecutionLogs
                    .Where(log => log.TaskId == task.Id)
                    .OrderByDescending(log => log.StartTime)
                    .Select(log => log.Status)
                    .FirstOrDefault(),
                LastExecutionTime = _context.TaskExecutionLogs
                    .Where(log => log.TaskId == task.Id)
                    .OrderByDescending(log => log.StartTime)
                    .Select(log => (DateTime?)log.StartTime)
                    .FirstOrDefault(),
                NextExecutionTime = task.Triggers
                    .Where(schedule => schedule.IsActive)
                    .OrderBy(schedule => schedule.NextExecutionTime)
                    .Select(schedule => schedule.NextExecutionTime)
                    .FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);

        var taskIdsWithSchedules = await _context.Schedules
            .AsNoTracking()
            .Select(schedule => schedule.TaskId)
            .Distinct()
            .ToHashSetAsync(cancellationToken);

        var tasksById = tasks.ToDictionary(task => task.Id);

        var scheduleQueue = await _context.Schedules
            .AsNoTracking()
            .Select(schedule => new ScheduleSnapshot
            {
                ScheduleId = schedule.Id,
                ScheduleName = schedule.Name,
                ScheduleDescription = schedule.Description,
                IsActive = schedule.IsActive,
                TriggerType = schedule.TriggerType,
                IntervalTime = schedule.IntervalTime,
                StartTime = schedule.StartTime,
                DaysOfWeek = schedule.DaysOfWeek,
                DayOfMonth = schedule.DayOfMonth,
                NextExecutionTime = schedule.NextExecutionTime,
                TaskId = schedule.TaskId,
            })
            .ToListAsync(cancellationToken);

        var enrichedQueue = scheduleQueue
            .Select(item =>
            {
                tasksById.TryGetValue(item.TaskId, out var task);

                return new DashboardScheduleQueueItemDto
                {
                    ScheduleId = item.ScheduleId,
                    ScheduleName = item.ScheduleName,
                    ScheduleDescription = item.ScheduleDescription,
                    IsActive = item.IsActive,
                    TriggerType = item.TriggerType,
                    IntervalTime = item.IntervalTime,
                    StartTime = item.StartTime?.ToString(@"hh\:mm\:ss"),
                    DaysOfWeek = item.DaysOfWeek,
                    DayOfMonth = item.DayOfMonth,
                    NextExecutionTime = item.NextExecutionTime,
                    TaskId = item.TaskId,
                    TaskName = task?.Name ?? $"Task #{item.TaskId}",
                    TaskIsActive = task?.IsActive ?? false,
                    TaskLastStatus = task?.LastStatus ?? "Unknown",
                    TaskLastExecutionTime = task?.LastExecutionTime,
                };
            })
            .OrderBy(item => item.NextExecutionTime ?? DateTime.MaxValue)
            .ThenBy(item => item.TaskName)
            .ThenBy(item => item.ScheduleName)
            .ToArray();

        var abnormalTasks = tasks
            .Select(task =>
            {
                var signals = new List<string>();

                if (!task.IsActive)
                {
                    signals.Add("Task is disabled");
                }

                if (HasFailureStatus(task.LastStatus))
                {
                    signals.Add("Last run failed");
                }

                if (HasRunningStatus(task.LastStatus))
                {
                    signals.Add("Execution still running");
                }

                if (task.IsActive && IsOverdue(task.NextExecutionTime, now))
                {
                    signals.Add("Next run is overdue");
                }

                if (task.IsActive && !taskIdsWithSchedules.Contains(task.Id))
                {
                    signals.Add("No schedule configured");
                }

                return new DashboardAbnormalTaskDto
                {
                    TaskId = task.Id,
                    TaskName = task.Name,
                    LastStatus = task.LastStatus ?? "Unknown",
                    NextExecutionTime = task.NextExecutionTime,
                    Signals = signals,
                };
            })
            .Where(item => item.Signals.Count > 0)
            .OrderByDescending(item => item.Signals.Count)
            .ThenBy(item => item.TaskName)
            .ToArray();

        return new DashboardSummaryDto
        {
            GeneratedAt = now,
            ScheduleQueue = enrichedQueue,
            AbnormalTasks = abnormalTasks,
        };
    }

    private static bool HasFailureStatus(string? value)
    {
        return !string.IsNullOrWhiteSpace(value)
            && value.Contains("fail", StringComparison.OrdinalIgnoreCase);
    }

    private static bool HasRunningStatus(string? value)
    {
        return !string.IsNullOrWhiteSpace(value)
            && value.Contains("running", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsOverdue(DateTime? nextExecutionTime, DateTime now)
    {
        return nextExecutionTime.HasValue && nextExecutionTime.Value < now;
    }

    private sealed class TaskSnapshot
    {
        public int Id { get; init; }

        public string Name { get; init; } = string.Empty;

        public bool IsActive { get; init; }

        public string? LastStatus { get; init; }

        public DateTime? LastExecutionTime { get; init; }

        public DateTime? NextExecutionTime { get; init; }
    }

    private sealed class ScheduleSnapshot
    {
        public int ScheduleId { get; init; }

        public string ScheduleName { get; init; } = string.Empty;

        public string? ScheduleDescription { get; init; }

        public bool IsActive { get; init; }

        public string TriggerType { get; init; } = string.Empty;

        public int? IntervalTime { get; init; }

        public TimeSpan? StartTime { get; init; }

        public string? DaysOfWeek { get; init; }

        public int? DayOfMonth { get; init; }

        public DateTime? NextExecutionTime { get; init; }

        public int TaskId { get; init; }
    }
}
