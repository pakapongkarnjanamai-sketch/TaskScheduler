namespace TaskScheduler.Client.ViewModels.Home;

public sealed class IndexViewModel
{
    public string ApiBaseUrl { get; init; } = string.Empty;
    public string HubUrl { get; init; } = string.Empty;
    public ScheduleEditorViewModel ScheduleEditor { get; init; } = new();
}

public sealed class ScheduleEditorViewModel
{
    public string DefaultTriggerType { get; init; } = string.Empty;
    public string InvalidTriggerValidationMessage { get; init; } = string.Empty;
    public IReadOnlyList<string> TriggerTypes { get; init; } = Array.Empty<string>();
    public IReadOnlyList<WeekDayOptionViewModel> WeekDayOptions { get; init; } = Array.Empty<WeekDayOptionViewModel>();
    public Dictionary<string, ScheduleTriggerRuleViewModel> TriggerRules { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class WeekDayOptionViewModel
{
    public string Value { get; init; } = string.Empty;
    public string Text { get; init; } = string.Empty;
}

public sealed class ScheduleTriggerRuleViewModel
{
    public string TriggerType { get; init; } = string.Empty;
    public bool UsesIntervalTime { get; init; }
    public bool UsesStartTime { get; init; }
    public bool UsesDaysOfWeek { get; init; }
    public bool UsesDayOfMonth { get; init; }
    public bool RequiresPositiveIntervalTime { get; init; }
    public bool RequiresStartTime { get; init; }
    public bool RequiresDaysOfWeek { get; init; }
    public bool RequiresDayOfMonthInRange { get; init; }
    public int? DefaultIntervalTime { get; init; }
    public int? DefaultDayOfMonth { get; init; }
    public IReadOnlyList<string> DefaultDaysOfWeek { get; init; } = Array.Empty<string>();
    public string? IntervalTimeValidationMessage { get; init; }
    public string? StartTimeValidationMessage { get; init; }
    public string? DaysOfWeekValidationMessage { get; init; }
    public string? DayOfMonthValidationMessage { get; init; }
}