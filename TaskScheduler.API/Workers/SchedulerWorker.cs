using Microsoft.EntityFrameworkCore;
using TaskScheduler.API.Services;
using TaskScheduler.Data;

namespace TaskScheduler.API.Workers
{
    public class SchedulerWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<SchedulerWorker> _logger;

        public SchedulerWorker(IServiceProvider serviceProvider, ILogger<SchedulerWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Scheduler Worker Started.");

            // ใช้ PeriodicTimer (Native .NET 6+) ตรวจสอบทุกๆ 10 วินาที
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(10));

            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await ProcessDueTasks(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in Scheduler Worker");
                }
            }
        }

        private async Task ProcessDueTasks(CancellationToken stoppingToken)
        {
            // BackgroundService เป็น Singleton แต่ DbContext เป็น Scoped จึงต้องสร้าง Scope ใหม่
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<TaskSchedulerDbContext>();
            var runner = scope.ServiceProvider.GetRequiredService<TaskRunnerService>();

            // หา Trigger ที่ถึงเวลาแล้ว (NextExecutionTime <= Now)
            var dueTriggers = await context.TaskTriggers
                .Where(t => t.IsActive && t.NextExecutionTime <= DateTime.UtcNow)
                .Select(t => t.Id)
                .ToListAsync(stoppingToken);

            foreach (var triggerId in dueTriggers)
            {
                // แยกการรันแต่ละ Task เพื่อไม่ให้ Task หนึ่งพังแล้วพาตัวอื่นหยุดไปด้วย
                try
                {
                    await runner.ExecuteTaskAsync(triggerId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Failed to process trigger {triggerId}");
                }
            }
        }
    }
}