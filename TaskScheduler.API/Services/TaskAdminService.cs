using DevExtreme.AspNet.Data;
using DevExtreme.AspNet.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using TaskScheduler.Data;

namespace TaskScheduler.API.Services;

public class TaskAdminService
{
    private readonly TaskSchedulerDbContext _context;

    public TaskAdminService(TaskSchedulerDbContext context)
    {
        _context = context;
    }

    public Task<object> GetAsync(DataSourceLoadOptions loadOptions, CancellationToken cancellationToken = default)
    {
        var source = _context.Tasks
            .AsNoTracking()
            .Select(task => new
            {
                task.Id,
                task.Name,
                task.Description,
                task.IsActive,
                task.UpdatedAt,
                LastStatus = _context.TaskExecutionLogs
                    .Where(log => log.TaskId == task.Id)
                    .OrderByDescending(log => log.StartTime)
                    .Select(log => log.Status)
                    .FirstOrDefault(),
                LastExecutionTime = _context.TaskExecutionLogs
                    .Where(log => log.TaskId == task.Id)
                    .OrderByDescending(log => log.StartTime)
                    .Select(log => (DateTime?)log.StartTime)
                    .FirstOrDefault(),
                NextExecutionTime = task.Triggers
                    .Where(schedule => schedule.IsActive)
                    .OrderBy(schedule => schedule.NextExecutionTime)
                    .Select(schedule => schedule.NextExecutionTime)
                    .FirstOrDefault()
            });

        return LoadAsync(source, loadOptions, cancellationToken);
    }

    public async Task<AdminOperationResult<TaskScheduler.Core.Models.Task>> CreateAsync(
        string values,
        CancellationToken cancellationToken = default)
    {
        var task = new TaskScheduler.Core.Models.Task();

        var populateError = TryPopulate(task, values);
        if (populateError is not null)
        {
            return AdminOperationResult<TaskScheduler.Core.Models.Task>.Invalid(populateError, task);
        }

        var validationError = ValidationMessageBuilder.Build(task);
        if (validationError is not null)
        {
            return AdminOperationResult<TaskScheduler.Core.Models.Task>.Invalid(validationError, task);
        }

        _context.Tasks.Add(task);
        await _context.SaveChangesAsync(cancellationToken);

        return AdminOperationResult<TaskScheduler.Core.Models.Task>.Success(task);
    }

    public async Task<AdminOperationResult<TaskScheduler.Core.Models.Task>> UpdateAsync(
        int key,
        string values,
        CancellationToken cancellationToken = default)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(item => item.Id == key, cancellationToken);
        if (task is null)
        {
            return AdminOperationResult<TaskScheduler.Core.Models.Task>.NotFound("Task not found");
        }

        var populateError = TryPopulate(task, values);
        if (populateError is not null)
        {
            return AdminOperationResult<TaskScheduler.Core.Models.Task>.Invalid(populateError, task);
        }

        var validationError = ValidationMessageBuilder.Build(task);
        if (validationError is not null)
        {
            return AdminOperationResult<TaskScheduler.Core.Models.Task>.Invalid(validationError, task);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return AdminOperationResult<TaskScheduler.Core.Models.Task>.Success(task);
    }

    public async Task<bool> DeleteAsync(int key, CancellationToken cancellationToken = default)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(item => item.Id == key, cancellationToken);
        if (task is null)
        {
            return false;
        }

        _context.Tasks.Remove(task);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static string? TryPopulate(TaskScheduler.Core.Models.Task task, string values)
    {
        try
        {
            JsonConvert.PopulateObject(values, task);
            return null;
        }
        catch (JsonException exception)
        {
            return exception.Message;
        }
    }

    private static async Task<object> LoadAsync<T>(
        IQueryable<T> source,
        DataSourceLoadOptions loadOptions,
        CancellationToken cancellationToken)
    {
        return await DataSourceLoader.LoadAsync(source, loadOptions, cancellationToken);
    }
}