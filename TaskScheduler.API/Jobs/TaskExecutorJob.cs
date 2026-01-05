using Quartz;
using TaskScheduler.Data;

namespace TaskScheduler.API.Jobs
{
    public class TaskExecutorJob : IJob
    {
        private readonly TaskSchedulerDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<TaskExecutorJob> _logger;

        public TaskExecutorJob(
            TaskSchedulerDbContext context,
            IHttpClientFactory httpClientFactory,
            ILogger<TaskExecutorJob> logger)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task Execute(IJobExecutionContext context)
        {
            var taskId = context.JobDetail.JobDataMap.GetInt("TaskId");
            var task = await _context.Tasks.FindAsync(taskId);

            if (task == null || !task.IsActive)
            {
                _logger.LogWarning("Task {TaskId} not found or inactive", taskId);
                return;
            }

            _logger.LogInformation("Executing task {TaskId}: {TaskName}", taskId, task.Name);

            var log = new Core.Models.TaskExecutionLog
            {
                TaskId = taskId,
                ExecutedAt = DateTime.UtcNow,
                Status = "Running"
            };

            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            try
            {
                var client = _httpClientFactory.CreateClient();
                var request = new HttpRequestMessage(
                    new HttpMethod(task.HttpMethod),
                    task.ApiUrl);

                // Add headers if provided
                if (!string.IsNullOrEmpty(task.Headers))
                {
                    var headers = System.Text.Json.JsonSerializer
                        .Deserialize<Dictionary<string, string>>(task.Headers);

                    if (headers != null)
                    {
                        foreach (var header in headers)
                        {
                            request.Headers.TryAddWithoutValidation(header.Key, header.Value);
                        }
                    }
                }

                // Add body if provided
                if (!string.IsNullOrEmpty(task.Body) &&
                    (task.HttpMethod == "POST" || task.HttpMethod == "PUT"))
                {
                    request.Content = new StringContent(
                        task.Body,
                        System.Text.Encoding.UTF8,
                        "application/json");
                }

                var response = await client.SendAsync(request);
                stopwatch.Stop();

                log.Status = response.IsSuccessStatusCode ? "Success" : "Failed";
                log.ResponseCode = (int)response.StatusCode;
                log.ResponseBody = await response.Content.ReadAsStringAsync();
                log.Duration = (int)stopwatch.ElapsedMilliseconds;

                _logger.LogInformation(
                    "Task {TaskId} completed with status {Status} in {Duration}ms",
                    taskId, log.Status, log.Duration);
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                log.Status = "Failed";
                log.ErrorMessage = ex.Message;
                log.Duration = (int)stopwatch.ElapsedMilliseconds;

                _logger.LogError(ex, "Task {TaskId} failed", taskId);
            }

            _context.TaskExecutionLogs.Add(log);
            await _context.SaveChangesAsync();
        }
    }
}