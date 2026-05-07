using Microsoft.EntityFrameworkCore;
using TaskScheduler.API.Services;
using TaskScheduler.Data;
using TaskScheduler.Tests.Support;
using ScheduleEntity = TaskScheduler.Core.Models.Schedule;
using TaskExecutionLogEntity = TaskScheduler.Core.Models.TaskExecutionLog;
using TaskEntity = TaskScheduler.Core.Models.Task;

namespace TaskScheduler.Tests.API.Services;

public class DashboardQueryServiceTests
{
    [Fact]
    public async Task GetSummaryAsync_WhenSchedulesExist_ReturnsQueueWithTaskNamesInNextRunOrder()
    {
        var clock = new FixedDateTime(new DateTime(2026, 5, 7, 10, 0, 0));
        await using var context = CreateContext(clock);

        var taskAlpha = new TaskEntity { Name = "Task Alpha", IsActive = true };
        var taskBeta = new TaskEntity { Name = "Task Beta", IsActive = true };
        context.Tasks.AddRange(taskAlpha, taskBeta);
        await context.SaveChangesAsync();

        context.Schedules.AddRange(
            new ScheduleEntity
            {
                TaskId = taskBeta.Id,
                Name = "Beta hourly",
                TriggerType = TaskScheduler.Core.Models.ScheduleTriggerTypes.Interval,
                IntervalTime = 60,
                IsActive = true,
                NextExecutionTime = clock.Now.AddHours(2),
            },
            new ScheduleEntity
            {
                TaskId = taskAlpha.Id,
                Name = "Alpha daily",
                TriggerType = TaskScheduler.Core.Models.ScheduleTriggerTypes.Daily,
                StartTime = new TimeSpan(10, 30, 0),
                IsActive = true,
                NextExecutionTime = clock.Now.AddMinutes(30),
            });

        await context.SaveChangesAsync();

        var service = new DashboardQueryService(context, clock);

        var result = await service.GetSummaryAsync();

        Assert.Equal(2, result.ScheduleQueue.Count);
        Assert.Equal("Task Alpha", result.ScheduleQueue[0].TaskName);
        Assert.Equal("Alpha daily", result.ScheduleQueue[0].ScheduleName);
        Assert.Equal("Task Beta", result.ScheduleQueue[1].TaskName);
        Assert.Equal("Beta hourly", result.ScheduleQueue[1].ScheduleName);
    }

    [Fact]
    public async Task GetSummaryAsync_WhenTasksHaveOperationalIssues_ReturnsExpectedAbnormalSignals()
    {
        var clock = new FixedDateTime(new DateTime(2026, 5, 7, 10, 0, 0));
        await using var context = CreateContext(clock);

        var disabledTask = new TaskEntity { Name = "Disabled Task", IsActive = false };
        var overdueTask = new TaskEntity { Name = "Overdue Task", IsActive = true };
        var failedTask = new TaskEntity { Name = "Failed Task", IsActive = true };
        var unscheduledTask = new TaskEntity { Name = "Unscheduled Task", IsActive = true };

        context.Tasks.AddRange(disabledTask, overdueTask, failedTask, unscheduledTask);
        await context.SaveChangesAsync();

        context.Schedules.AddRange(
            new ScheduleEntity
            {
                TaskId = disabledTask.Id,
                Name = "Disabled schedule",
                TriggerType = TaskScheduler.Core.Models.ScheduleTriggerTypes.Daily,
                StartTime = new TimeSpan(8, 0, 0),
                IsActive = false,
                NextExecutionTime = clock.Now.AddDays(1),
            },
            new ScheduleEntity
            {
                TaskId = overdueTask.Id,
                Name = "Overdue schedule",
                TriggerType = TaskScheduler.Core.Models.ScheduleTriggerTypes.Interval,
                IntervalTime = 30,
                IsActive = true,
                NextExecutionTime = clock.Now.AddMinutes(-20),
            },
            new ScheduleEntity
            {
                TaskId = failedTask.Id,
                Name = "Failed schedule",
                TriggerType = TaskScheduler.Core.Models.ScheduleTriggerTypes.Interval,
                IntervalTime = 60,
                IsActive = true,
                NextExecutionTime = clock.Now.AddHours(1),
            });

        context.TaskExecutionLogs.Add(new TaskExecutionLogEntity
        {
            TaskId = failedTask.Id,
            TriggerId = 0,
            StartTime = clock.Now.AddMinutes(-5),
            EndTime = clock.Now.AddMinutes(-4),
            Status = "Failed",
            IsActive = true,
        });

        await context.SaveChangesAsync();

        var service = new DashboardQueryService(context, clock);

        var result = await service.GetSummaryAsync();
        var abnormalities = result.AbnormalTasks.ToDictionary(item => item.TaskName, item => item.Signals, StringComparer.OrdinalIgnoreCase);

        Assert.Contains("Disabled Task", abnormalities.Keys);
        Assert.Contains("Overdue Task", abnormalities.Keys);
        Assert.Contains("Failed Task", abnormalities.Keys);
        Assert.Contains("Unscheduled Task", abnormalities.Keys);

        Assert.Contains("Task is disabled", abnormalities["Disabled Task"]);
        Assert.Contains("Next run is overdue", abnormalities["Overdue Task"]);
        Assert.Contains("Last run failed", abnormalities["Failed Task"]);
        Assert.Contains("No schedule configured", abnormalities["Unscheduled Task"]);
    }

    private static TaskSchedulerDbContext CreateContext(FixedDateTime clock)
    {
        var options = new DbContextOptionsBuilder<TaskSchedulerDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new TaskSchedulerDbContext(options, clock, new FakeCurrentUserService());
    }
}
