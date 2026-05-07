namespace TaskScheduler.API.Contracts.Dashboard;

public sealed class DashboardSummaryDto
{
    public DateTime GeneratedAt { get; init; }

    public IReadOnlyList<DashboardScheduleQueueItemDto> ScheduleQueue { get; init; } = Array.Empty<DashboardScheduleQueueItemDto>();

    public IReadOnlyList<DashboardAbnormalTaskDto> AbnormalTasks { get; init; } = Array.Empty<DashboardAbnormalTaskDto>();
}

public sealed class DashboardScheduleQueueItemDto
{
    public int ScheduleId { get; init; }

    public string ScheduleName { get; init; } = string.Empty;

    public string? ScheduleDescription { get; init; }

    public bool IsActive { get; init; }

    public string TriggerType { get; init; } = string.Empty;

    public int? IntervalTime { get; init; }

    public string? StartTime { get; init; }

    public string? DaysOfWeek { get; init; }

    public int? DayOfMonth { get; init; }

    public DateTime? NextExecutionTime { get; init; }

    public int TaskId { get; init; }

    public string TaskName { get; init; } = string.Empty;

    public bool TaskIsActive { get; init; }

    public string TaskLastStatus { get; init; } = "Unknown";

    public DateTime? TaskLastExecutionTime { get; init; }
}

public sealed class DashboardAbnormalTaskDto
{
    public int TaskId { get; init; }

    public string TaskName { get; init; } = string.Empty;

    public string LastStatus { get; init; } = "Unknown";

    public DateTime? NextExecutionTime { get; init; }

    public IReadOnlyList<string> Signals { get; init; } = Array.Empty<string>();
}
