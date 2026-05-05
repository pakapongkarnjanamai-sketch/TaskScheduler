namespace TaskScheduler.Core.Models;

public sealed class ScheduleTriggerRule
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

public static class ScheduleRules
{
    public const string InvalidTriggerTypeValidationMessage = "Trigger type must be Interval, Daily, Weekly, or Monthly.";

    private static readonly IReadOnlyDictionary<string, ScheduleTriggerRule> RulesByTriggerType =
        new Dictionary<string, ScheduleTriggerRule>(StringComparer.OrdinalIgnoreCase)
        {
            [ScheduleTriggerTypes.Interval] = new()
            {
                TriggerType = ScheduleTriggerTypes.Interval,
                UsesIntervalTime = true,
                RequiresPositiveIntervalTime = true,
                DefaultIntervalTime = 15,
                IntervalTimeValidationMessage = "Interval time must be greater than zero for interval schedules."
            },
            [ScheduleTriggerTypes.Daily] = new()
            {
                TriggerType = ScheduleTriggerTypes.Daily,
                UsesStartTime = true,
                RequiresStartTime = true,
                StartTimeValidationMessage = "Start time is required for daily schedules."
            },
            [ScheduleTriggerTypes.Weekly] = new()
            {
                TriggerType = ScheduleTriggerTypes.Weekly,
                UsesStartTime = true,
                UsesDaysOfWeek = true,
                RequiresStartTime = true,
                RequiresDaysOfWeek = true,
                DefaultDaysOfWeek = ["Monday"],
                StartTimeValidationMessage = "Start time is required for weekly schedules.",
                DaysOfWeekValidationMessage = "Select at least one weekday for weekly schedules."
            },
            [ScheduleTriggerTypes.Monthly] = new()
            {
                TriggerType = ScheduleTriggerTypes.Monthly,
                UsesStartTime = true,
                UsesDayOfMonth = true,
                RequiresStartTime = true,
                RequiresDayOfMonthInRange = true,
                DefaultDayOfMonth = 1,
                StartTimeValidationMessage = "Start time is required for monthly schedules.",
                DayOfMonthValidationMessage = "Day of month must be between 1 and 31 for monthly schedules."
            }
        };

    public static IReadOnlyList<string> TriggerTypes { get; } = ScheduleTriggerTypes.All;

    public static IEnumerable<ScheduleTriggerRule> All => TriggerTypes.Select(triggerType => RulesByTriggerType[triggerType]);

    public static bool TryGetRule(string? triggerType, out ScheduleTriggerRule rule)
    {
        return RulesByTriggerType.TryGetValue(triggerType ?? string.Empty, out rule!);
    }

    public static string NormalizeTriggerType(string? triggerType)
    {
        return TriggerTypes.FirstOrDefault(type => string.Equals(type, triggerType, StringComparison.OrdinalIgnoreCase))
            ?? (triggerType ?? string.Empty);
    }

    public static void Normalize(Schedule schedule)
    {
        schedule.TriggerType = NormalizeTriggerType(schedule.TriggerType);

        if (!TryGetRule(schedule.TriggerType, out var rule))
        {
            return;
        }

        if (!rule.UsesIntervalTime)
        {
            schedule.IntervalTime = null;
        }

        if (!rule.UsesStartTime)
        {
            schedule.StartTime = null;
        }

        if (!rule.UsesDaysOfWeek)
        {
            schedule.DaysOfWeek = null;
        }

        if (!rule.UsesDayOfMonth)
        {
            schedule.DayOfMonth = null;
        }
    }

    public static string? Validate(Schedule schedule)
    {
        var triggerType = NormalizeTriggerType(schedule.TriggerType);
        if (!TryGetRule(triggerType, out var rule))
        {
            return InvalidTriggerTypeValidationMessage;
        }

        if (rule.RequiresPositiveIntervalTime && schedule.IntervalTime is null or <= 0)
        {
            return rule.IntervalTimeValidationMessage;
        }

        if (rule.RequiresStartTime && !schedule.StartTime.HasValue)
        {
            return rule.StartTimeValidationMessage;
        }

        if (rule.RequiresDaysOfWeek && string.IsNullOrWhiteSpace(schedule.DaysOfWeek))
        {
            return rule.DaysOfWeekValidationMessage;
        }

        if (rule.RequiresDayOfMonthInRange && schedule.DayOfMonth is null or < 1 or > 31)
        {
            return rule.DayOfMonthValidationMessage;
        }

        return null;
    }
}