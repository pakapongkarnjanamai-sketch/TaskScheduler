using TaskScheduler.API.Services;
using TaskScheduler.Core.Models;
using TaskScheduler.Tests.Support;

namespace TaskScheduler.Tests.API.Services;

public class ScheduleTimingServiceTests
{
    [Fact]
    public void CalculateNextRun_WhenIntervalScheduleIsOneMinute_ReturnsNextMinuteBoundary()
    {
        var clock = new FixedDateTime(new DateTime(2026, 5, 5, 9, 10, 30));
        var service = new ScheduleTimingService(clock);
        var schedule = new Schedule
        {
            TriggerType = ScheduleTriggerTypes.Interval,
            IntervalTime = 1
        };

        service.CalculateNextRun(schedule, new DateTime(2026, 5, 5, 9, 10, 30));

        Assert.Equal(new DateTime(2026, 5, 5, 9, 11, 0), schedule.NextExecutionTime);
    }

    [Fact]
    public void CalculateNextRun_WhenWeeklyScheduleHasMultipleWeekdays_ReturnsNextSelectedWeekday()
    {
        var clock = new FixedDateTime(new DateTime(2026, 5, 5, 9, 10, 0));
        var service = new ScheduleTimingService(clock);
        var schedule = new Schedule
        {
            TriggerType = ScheduleTriggerTypes.Weekly,
            DaysOfWeek = "Wednesday,Friday",
            StartTime = new TimeSpan(7, 45, 0)
        };

        service.CalculateNextRun(schedule, new DateTime(2026, 5, 5, 9, 10, 0));

        Assert.Equal(new DateTime(2026, 5, 6, 7, 45, 0), schedule.NextExecutionTime);
    }

    [Fact]
    public void CalculateNextRun_WhenMonthlyScheduleHasConfiguredDay_ReturnsNextMonthOccurrence()
    {
        var clock = new FixedDateTime(new DateTime(2026, 5, 20, 10, 0, 0));
        var service = new ScheduleTimingService(clock);
        var schedule = new Schedule
        {
            TriggerType = ScheduleTriggerTypes.Monthly,
            DayOfMonth = 15,
            StartTime = new TimeSpan(8, 30, 0)
        };

        service.CalculateNextRun(schedule, new DateTime(2026, 5, 20, 10, 0, 0));

        Assert.Equal(new DateTime(2026, 6, 15, 8, 30, 0), schedule.NextExecutionTime);
    }

    [Fact]
    public void CalculateNextRun_WhenMonthlyScheduleUsesDayBeyondMonthLength_ClampsToLastDayOfMonth()
    {
        var clock = new FixedDateTime(new DateTime(2026, 2, 27, 10, 0, 0));
        var service = new ScheduleTimingService(clock);
        var schedule = new Schedule
        {
            TriggerType = ScheduleTriggerTypes.Monthly,
            DayOfMonth = 31,
            StartTime = new TimeSpan(9, 0, 0)
        };

        service.CalculateNextRun(schedule, new DateTime(2026, 2, 27, 10, 0, 0));

        Assert.Equal(new DateTime(2026, 2, 28, 9, 0, 0), schedule.NextExecutionTime);
    }
}