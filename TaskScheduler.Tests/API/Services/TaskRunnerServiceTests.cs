using System.Net;
using System.Net.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using TaskScheduler.API.Services;
using TaskScheduler.Data;
using TaskScheduler.Tests.Support;
using Schedule = TaskScheduler.Core.Models.Schedule;
using Step = TaskScheduler.Core.Models.Step;
using TaskEntity = TaskScheduler.Core.Models.Task;
using TaskExecutionLog = TaskScheduler.Core.Models.TaskExecutionLog;

namespace TaskScheduler.Tests.API.Services;

public class TaskRunnerServiceTests
{
    [Fact]
    public async Task RunTask_WhenAllStepsSucceed_CreatesLogs_RecalculatesSchedule_AndPublishesUpdates()
    {
        await using var context = CreateContext();
        var schedule = await SeedIntervalScheduleAsync(context, 15, CreateSuccessfulStep("Ping service", 1));
        var scheduleTimingService = CreateScheduleTimingService();

        using var httpClient = new HttpClient(new StubHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"ok\":true}")
            })));

        var hubContext = new RecordingTaskHubContext();
        var service = new TaskRunnerService(
            context,
            new StubHttpClientFactory(httpClient),
            NullLogger<TaskRunnerService>.Instance,
            scheduleTimingService,
            hubContext);

        await service.RunTask(schedule.Id);

        var executionLog = await context.TaskExecutionLogs.SingleAsync();
        var stepLog = await context.StepExecutionLogs.SingleAsync();
        var persistedSchedule = await context.Schedules.SingleAsync(s => s.Id == schedule.Id);

        Assert.Equal("Success", executionLog.Status);
        Assert.NotNull(executionLog.EndTime);
        Assert.Contains("Success", executionLog.ResponseMessage);

        Assert.Equal("Success", stepLog.Status);
        Assert.NotNull(stepLog.EndTime);
        Assert.Contains("Status: OK", stepLog.ResponseMessage);

        Assert.NotNull(persistedSchedule.LastExecutionTime);
        Assert.Equal(
            persistedSchedule.LastExecutionTime.Value.AddMinutes(15),
            persistedSchedule.NextExecutionTime);

        Assert.Equal(2, hubContext.Proxy.Invocations.Count);
        Assert.All(hubContext.Proxy.Invocations, invocation => Assert.Equal("ReceiveTaskUpdate", invocation.Method));
    }

    [Fact]
    public async Task RunTask_WhenScheduleIsInactive_DoesNotCreateLogsOrPublishUpdates()
    {
        await using var context = CreateContext();
        var schedule = await SeedIntervalScheduleAsync(context, 15, CreateSuccessfulStep("Ping service", 1));
        var scheduleTimingService = CreateScheduleTimingService();
        schedule.IsActive = false;
        await context.SaveChangesAsync();

        using var httpClient = new HttpClient(new StubHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("ok")
            })));

        var hubContext = new RecordingTaskHubContext();
        var service = new TaskRunnerService(
            context,
            new StubHttpClientFactory(httpClient),
            NullLogger<TaskRunnerService>.Instance,
            scheduleTimingService,
            hubContext);

        await service.RunTask(schedule.Id);

        Assert.Empty(context.TaskExecutionLogs);
        Assert.Empty(context.StepExecutionLogs);
        Assert.Empty(hubContext.Proxy.Invocations);
    }

    [Fact]
    public async Task RunTask_WhenTaskIsInactive_DoesNotCreateLogsOrPublishUpdates()
    {
        await using var context = CreateContext();
        var schedule = await SeedIntervalScheduleAsync(context, 15, CreateSuccessfulStep("Ping service", 1));
        var scheduleTimingService = CreateScheduleTimingService();
        schedule.Task!.IsActive = false;
        await context.SaveChangesAsync();

        using var httpClient = new HttpClient(new StubHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("ok")
            })));

        var hubContext = new RecordingTaskHubContext();
        var service = new TaskRunnerService(
            context,
            new StubHttpClientFactory(httpClient),
            NullLogger<TaskRunnerService>.Instance,
            scheduleTimingService,
            hubContext);

        await service.RunTask(schedule.Id);

        Assert.Empty(context.TaskExecutionLogs);
        Assert.Empty(context.StepExecutionLogs);
        Assert.Empty(hubContext.Proxy.Invocations);
    }

    [Fact]
    public async Task RunTask_WhenSameScheduleIsAlreadyRunning_DoesNotCreateDuplicateExecution()
    {
        await using var context = CreateContext();
        var schedule = await SeedIntervalScheduleAsync(context, 15, CreateSuccessfulStep("Ping service", 1));
        var scheduleTimingService = CreateScheduleTimingService();

        context.TaskExecutionLogs.Add(new TaskExecutionLog
        {
            TaskId = schedule.TaskId,
            TriggerId = schedule.Id,
            StartTime = new DateTime(2026, 5, 5, 9, 0, 0),
            Status = "Running",
            ResponseMessage = "Existing execution"
        });
        await context.SaveChangesAsync();

        using var httpClient = new HttpClient(new StubHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("ok")
            })));

        var hubContext = new RecordingTaskHubContext();
        var service = new TaskRunnerService(
            context,
            new StubHttpClientFactory(httpClient),
            NullLogger<TaskRunnerService>.Instance,
            scheduleTimingService,
            hubContext);

        await service.RunTask(schedule.Id);

        Assert.Single(context.TaskExecutionLogs);
        Assert.Empty(context.StepExecutionLogs);
        Assert.Empty(hubContext.Proxy.Invocations);
    }

    [Fact]
    public async Task RunTask_WhenStepFails_MarksTaskFailed_StopsRemainingSteps_AndPublishesUpdates()
    {
        await using var context = CreateContext();
        var schedule = await SeedIntervalScheduleAsync(
            context,
            30,
            CreateSuccessfulStep("First step", 1),
            CreateSuccessfulStep("Second step", 2));
        var scheduleTimingService = CreateScheduleTimingService();

        var requestCount = 0;
        using var httpClient = new HttpClient(new StubHttpMessageHandler((_, _) =>
        {
            requestCount++;

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError)
            {
                Content = new StringContent("boom")
            });
        }));

        var hubContext = new RecordingTaskHubContext();
        var service = new TaskRunnerService(
            context,
            new StubHttpClientFactory(httpClient),
            NullLogger<TaskRunnerService>.Instance,
            scheduleTimingService,
            hubContext);

        await service.RunTask(schedule.Id);

        var executionLog = await context.TaskExecutionLogs.SingleAsync();
        var stepLogs = await context.StepExecutionLogs.OrderBy(log => log.Order).ToListAsync();

        Assert.Equal(1, requestCount);
        Assert.Equal("Failed", executionLog.Status);
        Assert.Single(stepLogs);
        Assert.Equal("Failed", stepLogs[0].Status);
        Assert.Contains("Status: InternalServerError", stepLogs[0].ResponseMessage);
        Assert.Equal(2, hubContext.Proxy.Invocations.Count);
    }

    [Fact]
    public async Task RunTask_WhenStepHasHeadersAndPatchBody_SendsConfiguredRequest()
    {
        await using var context = CreateContext();
        var schedule = await SeedIntervalScheduleAsync(context, 15, new Step
        {
            Name = "Patch employee",
            Order = 1,
            ApiUrl = "https://example.test/api/employee",
            HttpMethod = "PATCH",
            Headers = "X-Test-Header: scheduler\nContent-Type: application/json",
            Body = "{\"active\":true}"
        });
        var scheduleTimingService = CreateScheduleTimingService();

        HttpRequestMessage? capturedRequest = null;
        using var httpClient = new HttpClient(new StubHttpMessageHandler((request, _) =>
        {
            capturedRequest = request;

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("ok")
            });
        }));

        var hubContext = new RecordingTaskHubContext();
        var service = new TaskRunnerService(
            context,
            new StubHttpClientFactory(httpClient),
            NullLogger<TaskRunnerService>.Instance,
            scheduleTimingService,
            hubContext);

        await service.RunTask(schedule.Id);

        Assert.NotNull(capturedRequest);
        Assert.Equal(HttpMethod.Patch, capturedRequest!.Method);
        Assert.True(capturedRequest.Headers.TryGetValues("X-Test-Header", out var headerValues));
        Assert.Equal("scheduler", Assert.Single(headerValues));
        Assert.Equal("{\"active\":true}", await capturedRequest.Content!.ReadAsStringAsync());
    }

    private static Step CreateSuccessfulStep(string name, int order)
    {
        return new Step
        {
            Name = name,
            Order = order,
            ApiUrl = "https://example.test/api/ping",
            HttpMethod = "GET"
        };
    }

    private static async Task<Schedule> SeedIntervalScheduleAsync(TaskSchedulerDbContext context, int intervalMinutes, params Step[] steps)
    {
        var task = new TaskEntity
        {
            Name = "Integration sync",
            Steps = steps.ToList()
        };

        var schedule = new Schedule
        {
            Name = "Every few minutes",
            TriggerType = "Interval",
            IntervalTime = intervalMinutes,
            Task = task
        };

        context.Schedules.Add(schedule);
        await context.SaveChangesAsync();

        return schedule;
    }

    private static TaskSchedulerDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<TaskSchedulerDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new TaskSchedulerDbContext(
            options,
            new FixedDateTime(new DateTime(2026, 5, 5, 9, 0, 0)),
            new FakeCurrentUserService());
    }

    private static ScheduleTimingService CreateScheduleTimingService()
    {
        return new ScheduleTimingService(new FixedDateTime(new DateTime(2026, 5, 5, 9, 0, 0)));
    }
}