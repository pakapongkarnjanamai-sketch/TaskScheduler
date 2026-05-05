using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using TaskScheduler.Data;
using TaskScheduler.Tests.Support;
using TaskEntity = TaskScheduler.Core.Models.Task;

namespace TaskScheduler.Tests.Data;

public class TaskSchedulerDbContextAuditTests
{
    [Fact]
    public async Task SaveChangesAsync_WhenEntityIsAdded_SetsCreatedAuditFields()
    {
        var clock = new FixedDateTime(new DateTime(2026, 5, 5, 9, 0, 0));
        await using var context = CreateContext(clock, "N4734");

        var task = new TaskEntity
        {
            Name = "Sync inventory"
        };

        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        Assert.Equal(clock.Now, task.CreatedAt);
        Assert.Equal("N4734", task.CreatedBy);
        Assert.Null(task.UpdatedAt);
        Assert.Null(task.UpdatedBy);
    }

    [Fact]
    public async Task SaveChangesAsync_WhenEntityIsUpdated_SetsUpdatedAuditFields_AndPreservesCreatedMetadata()
    {
        var clock = new FixedDateTime(new DateTime(2026, 5, 5, 9, 0, 0));
        await using var context = CreateContext(clock, "N4734");

        var task = new TaskEntity
        {
            Name = "Sync inventory"
        };

        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        var createdAt = task.CreatedAt;
        var createdBy = task.CreatedBy;

        clock.Now = new DateTime(2026, 5, 5, 10, 30, 0);
        task.Name = "Sync inventory v2";

        await context.SaveChangesAsync();

        Assert.Equal(createdAt, task.CreatedAt);
        Assert.Equal(createdBy, task.CreatedBy);
        Assert.Equal(clock.Now, task.UpdatedAt);
        Assert.Equal("N4734", task.UpdatedBy);
    }

    [Fact]
    public async Task SaveChangesAsync_WhenTaskIsRemoved_SoftDeletesAndStampsDeletionAudit()
    {
        var clock = new FixedDateTime(new DateTime(2026, 5, 5, 9, 0, 0));
        await using var context = CreateContext(clock, "N4734");

        var task = new TaskEntity
        {
            Name = "Sync inventory"
        };

        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        clock.Now = new DateTime(2026, 5, 5, 11, 45, 0);
        context.Tasks.Remove(task);
        await context.SaveChangesAsync();

        Assert.Empty(await context.Tasks.ToListAsync());

        var deletedTask = await context.Tasks.IgnoreQueryFilters().SingleAsync();

        Assert.True(deletedTask.IsDeleted);
        Assert.Equal(clock.Now, deletedTask.DeletedAt);
        Assert.Equal("N4734", deletedTask.DeletedBy);
    }

    [Fact]
    public async Task SaveChangesAsync_WhenScheduleIsRemoved_SoftDeletesAndKeepsRowInStore()
    {
        var clock = new FixedDateTime(new DateTime(2026, 5, 5, 9, 0, 0));
        await using var context = CreateContext(clock, "N4734");

        var schedule = new TaskScheduler.Core.Models.Schedule
        {
            Name = "Every 15 minutes",
            Task = new TaskEntity
            {
                Name = "Sync inventory"
            },
            TriggerType = "Interval",
            IntervalTime = 15
        };

        context.Schedules.Add(schedule);
        await context.SaveChangesAsync();

        clock.Now = new DateTime(2026, 5, 5, 12, 0, 0);
        context.Schedules.Remove(schedule);
        await context.SaveChangesAsync();

        Assert.Empty(await context.Schedules.ToListAsync());

        var deletedSchedule = await context.Schedules.IgnoreQueryFilters().SingleAsync();

        Assert.True(deletedSchedule.IsDeleted);
        Assert.Equal(clock.Now, deletedSchedule.DeletedAt);
        Assert.Equal("N4734", deletedSchedule.DeletedBy);
    }

    [Fact]
    public async Task SaveChangesAsync_WhenTaskIsRemoved_SoftDeletesRelatedSchedules()
    {
        var clock = new FixedDateTime(new DateTime(2026, 5, 5, 9, 0, 0));
        await using var context = CreateContext(clock, "N4734");

        var task = new TaskEntity
        {
            Name = "Sync inventory",
            Triggers =
            [
                new TaskScheduler.Core.Models.Schedule
                {
                    Name = "Every 15 minutes",
                    TriggerType = "Interval",
                    IntervalTime = 15
                }
            ]
        };

        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        clock.Now = new DateTime(2026, 5, 5, 12, 30, 0);
        context.Tasks.Remove(task);
        await context.SaveChangesAsync();

        Assert.Empty(await context.Schedules.ToListAsync());

        var deletedSchedule = await context.Schedules.IgnoreQueryFilters().SingleAsync();

        Assert.True(deletedSchedule.IsDeleted);
        Assert.Equal(clock.Now, deletedSchedule.DeletedAt);
        Assert.Equal("N4734", deletedSchedule.DeletedBy);
    }

    [Fact]
    public async Task QueryingExecutionLogs_WhenTaskIsSoftDeleted_PreservesHistoricalRows()
    {
        var clock = new FixedDateTime(new DateTime(2026, 5, 5, 9, 0, 0));
        await using var context = CreateContext(clock, "N4734");

        var task = new TaskEntity
        {
            Name = "Sync inventory"
        };

        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        context.TaskExecutionLogs.Add(new TaskScheduler.Core.Models.TaskExecutionLog
        {
            TaskId = task.Id,
            TriggerId = 99,
            StartTime = clock.Now,
            Status = "Success",
            ResponseMessage = "done"
        });
        await context.SaveChangesAsync();

        clock.Now = new DateTime(2026, 5, 5, 13, 0, 0);
        context.Tasks.Remove(task);
        await context.SaveChangesAsync();

        var logs = await context.TaskExecutionLogs.ToListAsync();

        Assert.Single(logs);
        Assert.Equal(task.Id, logs[0].TaskId);
    }

    private static TaskSchedulerDbContext CreateContext(FixedDateTime clock, string userId)
    {
        var options = new DbContextOptionsBuilder<TaskSchedulerDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new TaskSchedulerDbContext(
            options,
            clock,
            new FakeCurrentUserService
            {
                UserId = userId,
                FullName = $"DOMAIN\\{userId}",
                IsAuthenticated = true
            });
    }
}