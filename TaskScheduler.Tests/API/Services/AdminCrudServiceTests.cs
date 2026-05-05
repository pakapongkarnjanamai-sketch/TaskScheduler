using Microsoft.EntityFrameworkCore;
using TaskScheduler.API.Services;
using TaskScheduler.Data;
using TaskScheduler.Tests.Support;
using System.Collections;
using StepEntity = TaskScheduler.Core.Models.Step;
using TaskEntity = TaskScheduler.Core.Models.Task;

namespace TaskScheduler.Tests.API.Services;

public class AdminCrudServiceTests
{
    [Fact]
    public async Task StepAdminService_CreateAsync_WhenTaskAlreadyHasSteps_AppendsToTheEnd()
    {
        await using var context = CreateContext(new FixedDateTime(new DateTime(2026, 5, 5, 9, 0, 0)));
        var taskId = await SeedTaskWithStepsAsync(context, ("Login", 1), ("Fetch Data", 2));
        var service = new StepAdminService(context);

        var result = await service.CreateAsync(
            $"{{\"taskId\":{taskId},\"name\":\"Publish\",\"description\":\"Export step\",\"apiUrl\":\"https://example.test/publish\",\"httpMethod\":\"POST\"}}");

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(3, result.Value!.Order);
    }

    [Fact]
    public async Task StepAdminService_UpdateAsync_WhenStepOrderChanges_ReassignsSequentialOrder()
    {
        await using var context = CreateContext(new FixedDateTime(new DateTime(2026, 5, 5, 9, 0, 0)));
        var taskId = await SeedTaskWithStepsAsync(context, ("Login", 1), ("Fetch Data", 2), ("Publish", 3));
        var service = new StepAdminService(context);

        var stepToMove = await context.Steps
            .Where(step => step.TaskId == taskId)
            .SingleAsync(step => step.Name == "Login");

        var result = await service.UpdateAsync(stepToMove.Id, "{\"Order\":3}");

        Assert.True(result.IsSuccess);

        var reorderedSteps = await context.Steps
            .Where(step => step.TaskId == taskId)
            .OrderBy(step => step.Order)
            .ToListAsync();

        Assert.Collection(
            reorderedSteps,
            step =>
            {
                Assert.Equal("Fetch Data", step.Name);
                Assert.Equal(1, step.Order);
            },
            step =>
            {
                Assert.Equal("Publish", step.Name);
                Assert.Equal(2, step.Order);
            },
            step =>
            {
                Assert.Equal("Login", step.Name);
                Assert.Equal(3, step.Order);
            });
    }

    [Fact]
    public async Task TaskAdminService_CreateAsync_WhenNameIsMissing_ReturnsValidationError()
    {
        await using var context = CreateContext(new FixedDateTime(new DateTime(2026, 5, 5, 9, 0, 0)));
        var service = new TaskAdminService(context);

        var result = await service.CreateAsync("{\"description\":\"Missing name\"}");

        Assert.False(result.IsSuccess);
        Assert.False(result.IsNotFound);
        Assert.NotNull(result.ErrorMessage);
        Assert.Empty(await context.Tasks.ToListAsync());
    }

    [Fact]
    public async Task TaskAdminService_GetAsync_WhenTaskHasNoExecutionLogs_ReturnsNullLastExecutionTime()
    {
        await using var context = CreateContext(new FixedDateTime(new DateTime(2026, 5, 5, 9, 0, 0)));
        context.Tasks.Add(new TaskEntity
        {
            Name = "Inventory sync"
        });
        await context.SaveChangesAsync();

        var service = new TaskAdminService(context);

        var result = await service.GetAsync(new DevExtreme.AspNet.Mvc.DataSourceLoadOptions());

        var dataProperty = result.GetType().GetProperty("data") ?? result.GetType().GetProperty("Data");
        Assert.NotNull(dataProperty);

        var rows = Assert.IsAssignableFrom<IEnumerable>(dataProperty!.GetValue(result));
        var row = Assert.Single(rows.Cast<object>());
        var lastExecutionTime = row.GetType().GetProperty("LastExecutionTime")?.GetValue(row);

        Assert.Null(lastExecutionTime);
    }

    [Fact]
    public async Task ScheduleAdminService_CreateAsync_WhenIntervalScheduleIsCreated_CalculatesNextExecutionTimeFromBusinessClock()
    {
        var clock = new FixedDateTime(new DateTime(2026, 5, 5, 9, 7, 45));
        await using var context = CreateContext(clock);
        context.Tasks.Add(new TaskEntity
        {
            Name = "Inventory sync"
        });
        await context.SaveChangesAsync();

        var taskId = await context.Tasks.Select(task => task.Id).SingleAsync();
        var service = new ScheduleAdminService(context, new ScheduleTimingService(clock));

        var result = await service.CreateAsync(
            $"{{\"name\":\"Every 15 minutes\",\"taskId\":{taskId},\"triggerType\":\"Interval\",\"intervalTime\":15,\"isActive\":true}}");

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(new DateTime(2026, 5, 5, 9, 22, 0), result.Value!.NextExecutionTime);
    }

    [Fact]
    public async Task ScheduleAdminService_CreateAsync_WhenDailyScheduleHasNoStartTime_ReturnsValidationError()
    {
        var clock = new FixedDateTime(new DateTime(2026, 5, 5, 9, 7, 45));
        await using var context = CreateContext(clock);
        context.Tasks.Add(new TaskEntity
        {
            Name = "Inventory sync"
        });
        await context.SaveChangesAsync();

        var taskId = await context.Tasks.Select(task => task.Id).SingleAsync();
        var service = new ScheduleAdminService(context, new ScheduleTimingService(clock));

        var result = await service.CreateAsync(
            $"{{\"name\":\"Daily without start time\",\"taskId\":{taskId},\"triggerType\":\"Daily\",\"isActive\":true}}");

        Assert.False(result.IsSuccess);
        Assert.NotNull(result.ErrorMessage);
        Assert.Empty(await context.Schedules.ToListAsync());
    }

    [Fact]
    public async Task ScheduleAdminService_CreateAsync_WhenTriggerTypeIsUnsupported_ReturnsValidationError()
    {
        var clock = new FixedDateTime(new DateTime(2026, 5, 5, 9, 7, 45));
        await using var context = CreateContext(clock);
        context.Tasks.Add(new TaskEntity
        {
            Name = "Inventory sync"
        });
        await context.SaveChangesAsync();

        var taskId = await context.Tasks.Select(task => task.Id).SingleAsync();
        var service = new ScheduleAdminService(context, new ScheduleTimingService(clock));

        var result = await service.CreateAsync(
            $"{{\"name\":\"Weekly schedule\",\"taskId\":{taskId},\"triggerType\":\"Weekly\",\"intervalTime\":1,\"isActive\":true}}");

        Assert.False(result.IsSuccess);
        Assert.NotNull(result.ErrorMessage);
        Assert.Empty(await context.Schedules.ToListAsync());
    }

    [Fact]
    public async Task ScheduleAdminService_CreateAsync_WhenWeeklyScheduleHasNoWeekdays_ReturnsValidationError()
    {
        var clock = new FixedDateTime(new DateTime(2026, 5, 5, 9, 7, 45));
        await using var context = CreateContext(clock);
        context.Tasks.Add(new TaskEntity
        {
            Name = "Inventory sync"
        });
        await context.SaveChangesAsync();

        var taskId = await context.Tasks.Select(task => task.Id).SingleAsync();
        var service = new ScheduleAdminService(context, new ScheduleTimingService(clock));

        var result = await service.CreateAsync(
            $"{{\"name\":\"Weekly schedule\",\"taskId\":{taskId},\"triggerType\":\"Weekly\",\"startTime\":\"07:45:00\",\"isActive\":true}}");

        Assert.False(result.IsSuccess);
        Assert.NotNull(result.ErrorMessage);
        Assert.Empty(await context.Schedules.ToListAsync());
    }

    [Fact]
    public async Task ScheduleAdminService_CreateAsync_WhenMonthlyScheduleHasInvalidDayOfMonth_ReturnsValidationError()
    {
        var clock = new FixedDateTime(new DateTime(2026, 5, 5, 9, 7, 45));
        await using var context = CreateContext(clock);
        context.Tasks.Add(new TaskEntity
        {
            Name = "Inventory sync"
        });
        await context.SaveChangesAsync();

        var taskId = await context.Tasks.Select(task => task.Id).SingleAsync();
        var service = new ScheduleAdminService(context, new ScheduleTimingService(clock));

        var result = await service.CreateAsync(
            $"{{\"name\":\"Monthly schedule\",\"taskId\":{taskId},\"triggerType\":\"Monthly\",\"dayOfMonth\":0,\"startTime\":\"07:45:00\",\"isActive\":true}}");

        Assert.False(result.IsSuccess);
        Assert.NotNull(result.ErrorMessage);
        Assert.Empty(await context.Schedules.ToListAsync());
    }

    [Fact]
    public async Task ScheduleAdminService_CreateAsync_WhenWeeklyScheduleIsCreated_CalculatesNextExecutionTime()
    {
        var clock = new FixedDateTime(new DateTime(2026, 5, 5, 9, 7, 45));
        await using var context = CreateContext(clock);
        context.Tasks.Add(new TaskEntity
        {
            Name = "Inventory sync"
        });
        await context.SaveChangesAsync();

        var taskId = await context.Tasks.Select(task => task.Id).SingleAsync();
        var service = new ScheduleAdminService(context, new ScheduleTimingService(clock));

        var result = await service.CreateAsync(
            $"{{\"name\":\"Weekly schedule\",\"taskId\":{taskId},\"triggerType\":\"Weekly\",\"daysOfWeek\":\"Wednesday,Friday\",\"startTime\":\"07:45:00\",\"isActive\":true}}");

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(new DateTime(2026, 5, 6, 7, 45, 0), result.Value!.NextExecutionTime);
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

    private static async Task<int> SeedTaskWithStepsAsync(TaskSchedulerDbContext context, params (string name, int order)[] steps)
    {
        var task = new TaskEntity
        {
            Name = "Inventory sync"
        };

        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        foreach (var step in steps)
        {
            context.Steps.Add(new StepEntity
            {
                TaskId = task.Id,
                Name = step.name,
                Order = step.order,
                ApiUrl = $"https://example.test/{step.name.Replace(" ", string.Empty).ToLowerInvariant()}",
                HttpMethod = "POST"
            });
        }

        await context.SaveChangesAsync();
        return task.Id;
    }
}