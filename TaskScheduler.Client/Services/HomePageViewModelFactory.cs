using Microsoft.Extensions.Options;
using TaskScheduler.Client.Options;
using TaskScheduler.Client.ViewModels.Home;
using TaskScheduler.Core.Models;

namespace TaskScheduler.Client.Services;

public sealed class HomePageViewModelFactory
{
    private static readonly WeekDayOptionViewModel[] WeekDayOptions =
    [
        new() { Value = "Monday", Text = "Mon" },
        new() { Value = "Tuesday", Text = "Tue" },
        new() { Value = "Wednesday", Text = "Wed" },
        new() { Value = "Thursday", Text = "Thu" },
        new() { Value = "Friday", Text = "Fri" },
        new() { Value = "Saturday", Text = "Sat" },
        new() { Value = "Sunday", Text = "Sun" }
    ];

    private readonly TaskSchedulerApiOptions _apiOptions;

    public HomePageViewModelFactory(IOptions<TaskSchedulerApiOptions> apiOptions)
    {
        _apiOptions = apiOptions.Value;
    }

    public IndexViewModel Create()
    {
        var apiBaseUrl = NormalizeAbsoluteUrl(_apiOptions.BaseUrl);
        var hubUrl = new Uri(new Uri(apiBaseUrl, UriKind.Absolute), "../taskHub").ToString();

        return new IndexViewModel
        {
            ApiBaseUrl = apiBaseUrl,
            HubUrl = hubUrl,
            ScheduleEditor = new ScheduleEditorViewModel
            {
                DefaultTriggerType = ScheduleTriggerTypes.Interval,
                InvalidTriggerValidationMessage = ScheduleRules.InvalidTriggerTypeValidationMessage,
                TriggerTypes = ScheduleRules.TriggerTypes,
                WeekDayOptions = WeekDayOptions,
                TriggerRules = ScheduleRules.All.ToDictionary(
                    rule => rule.TriggerType,
                    rule => new ScheduleTriggerRuleViewModel
                    {
                        TriggerType = rule.TriggerType,
                        UsesIntervalTime = rule.UsesIntervalTime,
                        UsesStartTime = rule.UsesStartTime,
                        UsesDaysOfWeek = rule.UsesDaysOfWeek,
                        UsesDayOfMonth = rule.UsesDayOfMonth,
                        RequiresPositiveIntervalTime = rule.RequiresPositiveIntervalTime,
                        RequiresStartTime = rule.RequiresStartTime,
                        RequiresDaysOfWeek = rule.RequiresDaysOfWeek,
                        RequiresDayOfMonthInRange = rule.RequiresDayOfMonthInRange,
                        DefaultIntervalTime = rule.DefaultIntervalTime,
                        DefaultDayOfMonth = rule.DefaultDayOfMonth,
                        DefaultDaysOfWeek = rule.DefaultDaysOfWeek,
                        IntervalTimeValidationMessage = rule.IntervalTimeValidationMessage,
                        StartTimeValidationMessage = rule.StartTimeValidationMessage,
                        DaysOfWeekValidationMessage = rule.DaysOfWeekValidationMessage,
                        DayOfMonthValidationMessage = rule.DayOfMonthValidationMessage
                    },
                    StringComparer.OrdinalIgnoreCase)
            }
        };
    }

    private static string NormalizeAbsoluteUrl(string value)
    {
        var normalizedUrl = value.Trim();
        return normalizedUrl.EndsWith('/') ? normalizedUrl : normalizedUrl + "/";
    }
}