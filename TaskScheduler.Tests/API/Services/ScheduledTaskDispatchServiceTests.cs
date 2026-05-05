using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using TaskScheduler.API.Services;
using TaskScheduler.Data;
using TaskScheduler.Tests.Support;
using Schedule = TaskScheduler.Core.Models.Schedule;
using Step = TaskScheduler.Core.Models.Step;
using TaskEntity = TaskScheduler.Core.Models.Task;

namespace TaskScheduler.Tests.API.Services;

public class ScheduledTaskDispatchServiceTests
{
    [Fact]
    public async Task RunDueSchedulesAsync_WhenSchedulesAreDue_RunsOnlyEligibleSchedules()
    {
        var clock = new FixedDateTime(new DateTime(2026, 5, 5, 9, 0, 30));
        await using var context = CreateContext(clock);

        var dueSchedule = await SeedScheduleAsync(
            context,
            nextExecutionTime: new DateTime(2026, 5, 5, 9, 0, 0),
            isScheduleActive: true,
            isTaskActive: true,
            intervalMinutes: 15);

        await SeedScheduleAsync(
            context,
            nextExecutionTime: new DateTime(2026, 5, 5, 9, 5, 0),
            isScheduleActive: true,
            isTaskActive: true,
            intervalMinutes: 15);

        await SeedScheduleAsync(
            context,
            nextExecutionTime: new DateTime(2026, 5, 5, 9, 0, 0),
            isScheduleActive: false,
            isTaskActive: true,
            intervalMinutes: 15);

        var scheduleTimingService = new ScheduleTimingService(clock);
        using var httpClient = new HttpClient(new StubHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"ok\":true}")
            })));

        var taskRunnerService = new TaskRunnerService(
            context,
            new StubHttpClientFactory(httpClient),
            NullLogger<TaskRunnerService>.Instance,
            scheduleTimingService,
            new RecordingTaskHubContext());

        var dispatchService = new ScheduledTaskDispatchService(
            context,
            taskRunnerService,
            scheduleTimingService,
            NullLogger<ScheduledTaskDispatchService>.Instance);

        await dispatchService.RunDueSchedulesAsync();

        var executionLogs = await context.TaskExecutionLogs.OrderBy(log => log.Id).ToListAsync();

        Assert.Single(executionLogs);
        Assert.Equal(dueSchedule.Id, executionLogs[0].TriggerId);

        var persistedDueSchedule = await context.Schedules.SingleAsync(schedule => schedule.Id == dueSchedule.Id);
        Assert.Equal(new DateTime(2026, 5, 5, 9, 15, 0), persistedDueSchedule.NextExecutionTime);
    }

    private static async Task<Schedule> SeedScheduleAsync(
        TaskSchedulerDbContext context,
        DateTime nextExecutionTime,
        bool isScheduleActive,
        bool isTaskActive,
        int intervalMinutes)
    {
        var schedule = new Schedule
        {
            Name = $"Schedule {Guid.NewGuid():N}",
            TriggerType = "Interval",
            IntervalTime = intervalMinutes,
            NextExecutionTime = nextExecutionTime,
            IsActive = isScheduleActive,
            Task = new TaskEntity
            {
                Name = $"Task {Guid.NewGuid():N}",
                IsActive = isTaskActive,
                Steps =
                [
                    new Step
                    {
                        Name = "Ping service",
                        Order = 1,
                        ApiUrl = "https://example.test/api/ping",
                        HttpMethod = "GET"
                    }
                ]
            }
        };

        context.Schedules.Add(schedule);
        await context.SaveChangesAsync();

        return schedule;
    }

    private static TaskSchedulerDbContext CreateContext(FixedDateTime clock)
    {
        var options = new DbContextOptionsBuilder<TaskSchedulerDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new TaskSchedulerDbContext(
            options,
            clock,
            new FakeCurrentUserService());
    }
}