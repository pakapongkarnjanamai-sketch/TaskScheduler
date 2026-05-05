using DevExtreme.AspNet.Data;
using DevExtreme.AspNet.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Globalization;
using TaskScheduler.Core.Models;
using TaskScheduler.Data;
using TaskScheduler.Data.Services;

namespace TaskScheduler.API.Services;

public class ScheduleAdminService
{
    private static readonly string[] SupportedTriggerTypes = ScheduleTriggerTypes.All;
    private static readonly string[] SupportedTimeFormats = ["hh\\:mm", "hh\\:mm\\:ss", "HH\\:mm", "HH\\:mm\\:ss"];
    private static readonly TimeZoneInfo BusinessTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");

    private readonly TaskSchedulerDbContext _context;
    private readonly ScheduleTimingService _scheduleTimingService;

    public ScheduleAdminService(TaskSchedulerDbContext context, ScheduleTimingService scheduleTimingService)
    {
        _context = context;
        _scheduleTimingService = scheduleTimingService;
    }

    public Task<object> GetAsync(DataSourceLoadOptions loadOptions, CancellationToken cancellationToken = default)
    {
        var schedules = _context.Schedules
            .AsNoTracking()
            .Select(schedule => new
            {
                schedule.Id,
                schedule.TaskId,
                schedule.TriggerType,
                schedule.IntervalTime,
                schedule.StartTime,
                schedule.DaysOfWeek,
                schedule.DayOfMonth,
                schedule.IsActive,
                schedule.Name,
                schedule.Description,
                schedule.NextExecutionTime
            });

        return LoadAsync(schedules, loadOptions, cancellationToken);
    }

    public async Task<AdminOperationResult<Schedule>> CreateAsync(string values, CancellationToken cancellationToken = default)
    {
        var schedule = new Schedule();

        var populateError = PopulateModel(schedule, values);
        if (populateError is not null)
        {
            return AdminOperationResult<Schedule>.Invalid(populateError, schedule);
        }

        var validationError = ValidationMessageBuilder.Build(schedule);
        if (validationError is not null)
        {
            return AdminOperationResult<Schedule>.Invalid(validationError, schedule);
        }

        NormalizeSchedule(schedule);

        var scheduleValidationError = BuildScheduleValidationError(schedule);
        if (scheduleValidationError is not null)
        {
            return AdminOperationResult<Schedule>.Invalid(scheduleValidationError, schedule);
        }

        _scheduleTimingService.CalculateNextRun(schedule);

        _context.Schedules.Add(schedule);
        await _context.SaveChangesAsync(cancellationToken);

        return AdminOperationResult<Schedule>.Success(schedule);
    }

    public async Task<AdminOperationResult<Schedule>> UpdateAsync(int key, string values, CancellationToken cancellationToken = default)
    {
        var schedule = await _context.Schedules.FirstOrDefaultAsync(item => item.Id == key, cancellationToken);
        if (schedule is null)
        {
            return AdminOperationResult<Schedule>.NotFound("Object not found");
        }

        var populateError = PopulateModel(schedule, values);
        if (populateError is not null)
        {
            return AdminOperationResult<Schedule>.Invalid(populateError, schedule);
        }

        var validationError = ValidationMessageBuilder.Build(schedule);
        if (validationError is not null)
        {
            return AdminOperationResult<Schedule>.Invalid(validationError, schedule);
        }

        NormalizeSchedule(schedule);

        var scheduleValidationError = BuildScheduleValidationError(schedule);
        if (scheduleValidationError is not null)
        {
            return AdminOperationResult<Schedule>.Invalid(scheduleValidationError, schedule);
        }

        _scheduleTimingService.CalculateNextRun(schedule);
        await _context.SaveChangesAsync(cancellationToken);

        return AdminOperationResult<Schedule>.Success(schedule);
    }

    public async Task<bool> DeleteAsync(int key, CancellationToken cancellationToken = default)
    {
        var schedule = await _context.Schedules.FirstOrDefaultAsync(item => item.Id == key, cancellationToken);
        if (schedule is null)
        {
            return false;
        }

        _context.Schedules.Remove(schedule);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static string? PopulateModel(Schedule schedule, string values)
    {
        IDictionary<string, object>? valuesDict;

        try
        {
            valuesDict = JsonConvert.DeserializeObject<IDictionary<string, object>>(values);
        }
        catch (JsonException exception)
        {
            return exception.Message;
        }

        if (valuesDict is null)
        {
            return "Schedule payload is required.";
        }

        var caseInsensitiveValues = new Dictionary<string, object>(valuesDict, StringComparer.OrdinalIgnoreCase);

        if (caseInsensitiveValues.TryGetValue(nameof(Schedule.Id), out var idValue) && idValue is not null)
        {
            schedule.Id = Convert.ToInt32(idValue);
        }

        if (caseInsensitiveValues.TryGetValue(nameof(Schedule.Name), out var nameValue))
        {
            schedule.Name = Convert.ToString(nameValue) ?? string.Empty;
        }

        if (caseInsensitiveValues.TryGetValue(nameof(Schedule.Description), out var descriptionValue))
        {
            schedule.Description = Convert.ToString(descriptionValue);
        }

        if (caseInsensitiveValues.TryGetValue(nameof(Schedule.IsActive), out var isActiveValue) && isActiveValue is not null)
        {
            schedule.IsActive = Convert.ToBoolean(isActiveValue);
        }

        if (caseInsensitiveValues.TryGetValue(nameof(Schedule.TriggerType), out var triggerTypeValue))
        {
            schedule.TriggerType = Convert.ToString(triggerTypeValue) ?? schedule.TriggerType;
        }

        if (caseInsensitiveValues.TryGetValue(nameof(Schedule.IntervalTime), out var intervalTimeValue))
        {
            schedule.IntervalTime = intervalTimeValue is not null
                ? Convert.ToInt32(intervalTimeValue)
                : null;
        }

        if (caseInsensitiveValues.TryGetValue(nameof(Schedule.StartTime), out var startTimeValue))
        {
            var rawStartTime = Convert.ToString(startTimeValue);
            schedule.StartTime = TryParseTime(rawStartTime, out var parsedTime)
                ? parsedTime
                : null;
        }

        if (caseInsensitiveValues.TryGetValue(nameof(Schedule.DaysOfWeek), out var daysOfWeekValue))
        {
            schedule.DaysOfWeek = ConvertToDelimitedString(daysOfWeekValue);
        }

        if (caseInsensitiveValues.TryGetValue(nameof(Schedule.DayOfMonth), out var dayOfMonthValue))
        {
            var rawDayOfMonth = Convert.ToString(dayOfMonthValue);
            schedule.DayOfMonth = string.IsNullOrWhiteSpace(rawDayOfMonth)
                ? null
                : Convert.ToInt32(dayOfMonthValue);
        }

        if (caseInsensitiveValues.TryGetValue(nameof(Schedule.TaskId), out var taskIdValue) && taskIdValue is not null)
        {
            schedule.TaskId = Convert.ToInt32(taskIdValue);
        }

        return null;
    }

    private void NormalizeSchedule(Schedule schedule)
    {
        schedule.TriggerType = NormalizeTriggerType(schedule.TriggerType);
        schedule.StartTime = schedule.StartTime.HasValue
            ? new TimeSpan(schedule.StartTime.Value.Hours, schedule.StartTime.Value.Minutes, 0)
            : null;
        schedule.DaysOfWeek = NormalizeDaysOfWeek(schedule.DaysOfWeek);

        if (string.Equals(schedule.TriggerType, ScheduleTriggerTypes.Interval, StringComparison.OrdinalIgnoreCase))
        {
            schedule.StartTime = null;
            schedule.DaysOfWeek = null;
            schedule.DayOfMonth = null;
            return;
        }

        schedule.IntervalTime = null;

        if (string.Equals(schedule.TriggerType, ScheduleTriggerTypes.Daily, StringComparison.OrdinalIgnoreCase))
        {
            schedule.DaysOfWeek = null;
            schedule.DayOfMonth = null;
            return;
        }

        if (string.Equals(schedule.TriggerType, ScheduleTriggerTypes.Weekly, StringComparison.OrdinalIgnoreCase))
        {
            schedule.DayOfMonth = null;
            return;
        }

        if (string.Equals(schedule.TriggerType, ScheduleTriggerTypes.Monthly, StringComparison.OrdinalIgnoreCase))
        {
            schedule.DaysOfWeek = null;
        }
    }

    private static string? BuildScheduleValidationError(Schedule schedule)
    {
        if (!SupportedTriggerTypes.Contains(schedule.TriggerType, StringComparer.OrdinalIgnoreCase))
        {
            return "Trigger type must be Interval, Daily, Weekly, or Monthly.";
        }

        if (string.Equals(schedule.TriggerType, ScheduleTriggerTypes.Interval, StringComparison.OrdinalIgnoreCase)
            && schedule.IntervalTime is null or <= 0)
        {
            return "Interval time must be greater than zero for interval schedules.";
        }

        if (string.Equals(schedule.TriggerType, ScheduleTriggerTypes.Daily, StringComparison.OrdinalIgnoreCase)
            && !schedule.StartTime.HasValue)
        {
            return "Start time is required for daily schedules.";
        }

        if (string.Equals(schedule.TriggerType, ScheduleTriggerTypes.Weekly, StringComparison.OrdinalIgnoreCase))
        {
            if (!schedule.StartTime.HasValue)
            {
                return "Start time is required for weekly schedules.";
            }

            if (string.IsNullOrWhiteSpace(schedule.DaysOfWeek))
            {
                return "Select at least one weekday for weekly schedules.";
            }
        }

        if (string.Equals(schedule.TriggerType, ScheduleTriggerTypes.Monthly, StringComparison.OrdinalIgnoreCase))
        {
            if (!schedule.StartTime.HasValue)
            {
                return "Start time is required for monthly schedules.";
            }

            if (schedule.DayOfMonth is null or < 1 or > 31)
            {
                return "Day of month must be between 1 and 31 for monthly schedules.";
            }
        }

        return null;
    }

    private static string NormalizeTriggerType(string? triggerType)
    {
        return SupportedTriggerTypes.FirstOrDefault(type => string.Equals(type, triggerType, StringComparison.OrdinalIgnoreCase))
            ?? (triggerType ?? string.Empty);
    }

    private static string? NormalizeDaysOfWeek(string? rawDays)
    {
        if (string.IsNullOrWhiteSpace(rawDays))
        {
            return null;
        }

        var orderedDays = rawDays
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(value => Enum.TryParse<DayOfWeek>(value, true, out var day) ? day : (DayOfWeek?)null)
            .Where(day => day.HasValue)
            .Select(day => day!.Value)
            .Distinct()
            .OrderBy(GetDaySortOrder)
            .Select(day => day.ToString())
            .ToArray();

        return orderedDays.Length == 0
            ? null
            : string.Join(",", orderedDays);
    }

    private static int GetDaySortOrder(DayOfWeek day)
    {
        return day == DayOfWeek.Sunday ? 7 : (int)day;
    }

    private static string? ConvertToDelimitedString(object? rawValue)
    {
        if (rawValue is null)
        {
            return null;
        }

        if (rawValue is JArray array)
        {
            return string.Join(",", array.Values<string>().Where(value => !string.IsNullOrWhiteSpace(value)));
        }

        if (rawValue is IEnumerable<object> values && rawValue is not string)
        {
            return string.Join(",", values.Select(Convert.ToString).Where(value => !string.IsNullOrWhiteSpace(value)));
        }

        return Convert.ToString(rawValue);
    }

    private static bool TryParseTime(string? rawStartTime, out TimeSpan parsedTime)
    {
        if (string.IsNullOrWhiteSpace(rawStartTime))
        {
            parsedTime = default;
            return false;
        }

        if (TimeSpan.TryParseExact(rawStartTime, SupportedTimeFormats, CultureInfo.InvariantCulture, out parsedTime))
        {
            return true;
        }

        if (LooksLikeOffsetDateTime(rawStartTime)
            && DateTimeOffset.TryParse(rawStartTime, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var offsetDateTime))
        {
            parsedTime = TimeZoneInfo.ConvertTime(offsetDateTime, BusinessTimeZone).TimeOfDay;
            return true;
        }

        if (DateTime.TryParse(rawStartTime, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var invariantDateTime))
        {
            parsedTime = invariantDateTime.TimeOfDay;
            return true;
        }

        if (DateTime.TryParse(rawStartTime, out var localDateTime))
        {
            parsedTime = localDateTime.TimeOfDay;
            return true;
        }

        parsedTime = default;
        return false;
    }

    private static bool LooksLikeOffsetDateTime(string value)
    {
        var timeSeparatorIndex = value.IndexOf('T');
        if (timeSeparatorIndex < 0)
        {
            return false;
        }

        return value.EndsWith("Z", StringComparison.OrdinalIgnoreCase)
            || value.IndexOf('+', timeSeparatorIndex) >= 0
            || value.IndexOf('-', timeSeparatorIndex + 1) >= 0;
    }

    private static async Task<object> LoadAsync<T>(
        IQueryable<T> source,
        DataSourceLoadOptions loadOptions,
        CancellationToken cancellationToken)
    {
        return await DataSourceLoader.LoadAsync(source, loadOptions, cancellationToken);
    }
}