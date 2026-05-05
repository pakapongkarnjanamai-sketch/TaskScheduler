using TaskScheduler.Core.Models;
using TaskScheduler.Data.Services;

namespace TaskScheduler.API.Services;

public class ScheduleTimingService
{
    private readonly IDateTime _dateTime;

    public ScheduleTimingService(IDateTime dateTime)
    {
        _dateTime = dateTime;
    }

    public DateTime GetCurrentBusinessTime()
    {
        return _dateTime.Now;
    }

    public DateTime GetCurrentBusinessMinute()
    {
        var now = _dateTime.Now;
        return new DateTime(now.Year, now.Month, now.Day, now.Hour, now.Minute, 0);
    }

    public void CalculateNextRun(Schedule schedule, DateTime? baseTime = null)
    {
        var effectiveBaseTime = TrimToMinute(baseTime ?? GetCurrentBusinessMinute());

        if (string.Equals(schedule.TriggerType, ScheduleTriggerTypes.Interval, StringComparison.OrdinalIgnoreCase)
            && schedule.IntervalTime > 0)
        {
            schedule.NextExecutionTime = effectiveBaseTime.AddMinutes(schedule.IntervalTime.Value);
            return;
        }

        if (string.Equals(schedule.TriggerType, ScheduleTriggerTypes.Daily, StringComparison.OrdinalIgnoreCase)
            && schedule.StartTime.HasValue)
        {
            schedule.NextExecutionTime = CalculateDailyNextRun(schedule.StartTime.Value, effectiveBaseTime);
            return;
        }

        if (string.Equals(schedule.TriggerType, ScheduleTriggerTypes.Weekly, StringComparison.OrdinalIgnoreCase)
            && schedule.StartTime.HasValue)
        {
            schedule.NextExecutionTime = CalculateWeeklyNextRun(schedule, effectiveBaseTime);
            return;
        }

        if (string.Equals(schedule.TriggerType, ScheduleTriggerTypes.Monthly, StringComparison.OrdinalIgnoreCase)
            && schedule.StartTime.HasValue
            && schedule.DayOfMonth is >= 1 and <= 31)
        {
            schedule.NextExecutionTime = CalculateMonthlyNextRun(schedule, effectiveBaseTime);
            return;
        }

        schedule.NextExecutionTime = null;
    }

    private static DateTime TrimToMinute(DateTime value)
    {
        return new DateTime(value.Year, value.Month, value.Day, value.Hour, value.Minute, 0);
    }

    private static DateTime CalculateDailyNextRun(TimeSpan startTime, DateTime baseTime)
    {
        var startClean = new TimeSpan(startTime.Hours, startTime.Minutes, 0);
        var todayRun = baseTime.Date.Add(startClean);

        return todayRun > baseTime
            ? todayRun
            : todayRun.AddDays(1);
    }

    private static DateTime? CalculateWeeklyNextRun(Schedule schedule, DateTime baseTime)
    {
        var startClean = new TimeSpan(schedule.StartTime!.Value.Hours, schedule.StartTime.Value.Minutes, 0);
        var selectedDays = ParseDaysOfWeek(schedule.DaysOfWeek);

        if (selectedDays.Count == 0)
        {
            return null;
        }

        for (var dayOffset = 0; dayOffset < 14; dayOffset++)
        {
            var candidateDate = baseTime.Date.AddDays(dayOffset);
            if (!selectedDays.Contains(candidateDate.DayOfWeek))
            {
                continue;
            }

            var candidate = candidateDate.Add(startClean);
            if (candidate > baseTime)
            {
                return candidate;
            }
        }

        return null;
    }

    private static DateTime? CalculateMonthlyNextRun(Schedule schedule, DateTime baseTime)
    {
        var startClean = new TimeSpan(schedule.StartTime!.Value.Hours, schedule.StartTime.Value.Minutes, 0);

        for (var monthOffset = 0; monthOffset < 24; monthOffset++)
        {
            var monthStart = new DateTime(baseTime.Year, baseTime.Month, 1).AddMonths(monthOffset);
            var day = Math.Min(schedule.DayOfMonth!.Value, DateTime.DaysInMonth(monthStart.Year, monthStart.Month));
            var candidate = new DateTime(monthStart.Year, monthStart.Month, day, startClean.Hours, startClean.Minutes, 0);

            if (candidate > baseTime)
            {
                return candidate;
            }
        }

        return null;
    }

    private static HashSet<DayOfWeek> ParseDaysOfWeek(string? rawDays)
    {
        var days = new HashSet<DayOfWeek>();

        if (string.IsNullOrWhiteSpace(rawDays))
        {
            return days;
        }

        foreach (var value in rawDays.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (Enum.TryParse<DayOfWeek>(value, true, out var day))
            {
                days.Add(day);
            }
        }

        return days;
    }
}