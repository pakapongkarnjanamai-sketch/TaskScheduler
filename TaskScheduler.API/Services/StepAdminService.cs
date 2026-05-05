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
        return LoadAsync(
            _context.Steps
                .AsNoTracking()
                .OrderBy(step => step.TaskId)
                .ThenBy(step => step.Order)
                .ThenBy(step => step.Id),
            loadOptions,
            cancellationToken);
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

        step.Order = await GetNextOrderAsync(step.TaskId, cancellationToken);
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

        var originalTaskId = step.TaskId;
        var originalOrder = step.Order;

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

        if (step.Order <= 0)
        {
            return AdminOperationResult<Step>.Invalid("Step order must be greater than zero.", step);
        }

        if (step.TaskId == originalTaskId && step.Order != originalOrder)
        {
            var targetOrder = await NormalizeRequestedOrderAsync(step.TaskId, step.Order, step.Id, cancellationToken);
            await ShiftStepOrderAsync(step.TaskId, step.Id, originalOrder, targetOrder, cancellationToken);
            step.Order = targetOrder;
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

        var taskId = step.TaskId;
        _context.Steps.Remove(step);

        var remainingSteps = await GetStepsForTaskAsync(taskId, cancellationToken, key);
        ApplySequentialOrder(remainingSteps);

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

    private async Task<int> GetNextOrderAsync(int taskId, CancellationToken cancellationToken)
    {
        var maxOrder = await _context.Steps
            .Where(step => step.TaskId == taskId)
            .Select(step => (int?)step.Order)
            .MaxAsync(cancellationToken);

        return (maxOrder ?? 0) + 1;
    }

    private async Task<int> NormalizeRequestedOrderAsync(int taskId, int requestedOrder, int stepId, CancellationToken cancellationToken)
    {
        var maxOrder = await _context.Steps
            .Where(step => step.TaskId == taskId && step.Id != stepId)
            .Select(step => (int?)step.Order)
            .MaxAsync(cancellationToken);

        return Math.Clamp(requestedOrder, 1, (maxOrder ?? 0) + 1);
    }

    private async System.Threading.Tasks.Task ShiftStepOrderAsync(int taskId, int stepId, int originalOrder, int targetOrder, CancellationToken cancellationToken)
    {
        if (originalOrder == targetOrder)
        {
            return;
        }

        var siblings = await GetStepsForTaskAsync(taskId, cancellationToken, stepId);

        if (originalOrder < targetOrder)
        {
            foreach (var sibling in siblings.Where(step => step.Order > originalOrder && step.Order <= targetOrder))
            {
                sibling.Order--;
            }

            return;
        }

        foreach (var sibling in siblings.Where(step => step.Order >= targetOrder && step.Order < originalOrder))
        {
            sibling.Order++;
        }
    }

    private Task<List<Step>> GetStepsForTaskAsync(int taskId, CancellationToken cancellationToken, int? excludedStepId = null)
    {
        var query = _context.Steps
            .Where(step => step.TaskId == taskId);

        if (excludedStepId.HasValue)
        {
            query = query.Where(step => step.Id != excludedStepId.Value);
        }

        return query
            .OrderBy(step => step.Order)
            .ThenBy(step => step.Id)
            .ToListAsync(cancellationToken);
    }

    private static void ApplySequentialOrder(IReadOnlyList<Step> steps)
    {
        for (var index = 0; index < steps.Count; index++)
        {
            steps[index].Order = index + 1;
        }
    }
}