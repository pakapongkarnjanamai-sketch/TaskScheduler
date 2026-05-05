using DevExtreme.AspNet.Data;
using DevExtreme.AspNet.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using TaskScheduler.Core.Models;
using TaskScheduler.Data;

namespace TaskScheduler.API.Services;

public class StepAdminService
{
    private readonly TaskSchedulerDbContext _context;

    public StepAdminService(TaskSchedulerDbContext context)
    {
        _context = context;
    }

    public Task<object> GetAsync(DataSourceLoadOptions loadOptions, CancellationToken cancellationToken = default)
    {
        return LoadAsync(_context.Steps.AsNoTracking(), loadOptions, cancellationToken);
    }

    public async Task<AdminOperationResult<Step>> CreateAsync(string values, CancellationToken cancellationToken = default)
    {
        var step = new Step();

        var populateError = TryPopulate(step, values);
        if (populateError is not null)
        {
            return AdminOperationResult<Step>.Invalid(populateError, step);
        }

        var validationError = ValidationMessageBuilder.Build(step);
        if (validationError is not null)
        {
            return AdminOperationResult<Step>.Invalid(validationError, step);
        }

        _context.Steps.Add(step);
        await _context.SaveChangesAsync(cancellationToken);

        return AdminOperationResult<Step>.Success(step);
    }

    public async Task<AdminOperationResult<Step>> UpdateAsync(int key, string values, CancellationToken cancellationToken = default)
    {
        var step = await _context.Steps.FirstOrDefaultAsync(item => item.Id == key, cancellationToken);
        if (step is null)
        {
            return AdminOperationResult<Step>.NotFound("Step not found");
        }

        var populateError = TryPopulate(step, values);
        if (populateError is not null)
        {
            return AdminOperationResult<Step>.Invalid(populateError, step);
        }

        var validationError = ValidationMessageBuilder.Build(step);
        if (validationError is not null)
        {
            return AdminOperationResult<Step>.Invalid(validationError, step);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return AdminOperationResult<Step>.Success(step);
    }

    public async Task<bool> DeleteAsync(int key, CancellationToken cancellationToken = default)
    {
        var step = await _context.Steps.FirstOrDefaultAsync(item => item.Id == key, cancellationToken);
        if (step is null)
        {
            return false;
        }

        _context.Steps.Remove(step);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static string? TryPopulate(Step step, string values)
    {
        try
        {
            JsonConvert.PopulateObject(values, step);
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