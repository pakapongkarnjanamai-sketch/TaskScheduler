using DevExtreme.AspNet.Data;
using DevExtreme.AspNet.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskScheduler.Data;

namespace TaskScheduler.API.Services;

public class ExecutionLogQueryService
{
    private readonly TaskSchedulerDbContext _context;

    public ExecutionLogQueryService(TaskSchedulerDbContext context)
    {
        _context = context;
    }

    public Task<object> GetTaskExecutionLogsAsync(DataSourceLoadOptions loadOptions, CancellationToken cancellationToken = default)
    {
        var logsQuery = _context.TaskExecutionLogs
            .AsNoTracking()
            .OrderByDescending(log => log.StartTime);

        return LoadAsync(logsQuery, loadOptions, cancellationToken);
    }

    public Task<object> GetStepExecutionLogsAsync(DataSourceLoadOptions loadOptions, CancellationToken cancellationToken = default)
    {
        var source = _context.StepExecutionLogs
            .AsNoTracking()
            .Include(log => log.TaskExecutionLog)
            .AsQueryable();

        return LoadAsync(source, loadOptions, cancellationToken);
    }

    private static async Task<object> LoadAsync<T>(
        IQueryable<T> source,
        DataSourceLoadOptions loadOptions,
        CancellationToken cancellationToken)
    {
        return await DataSourceLoader.LoadAsync(source, loadOptions, cancellationToken);
    }
}