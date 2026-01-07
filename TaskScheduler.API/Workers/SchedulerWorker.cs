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

            while (!stoppingToken.IsCancellationRequested)
            {
                // ✅ 1. กำหนดเวลาปัจจุบันเป็น Thai Time (UTC+7)
                var thaiNow = DateTime.UtcNow.AddHours(7);

                try
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<TaskSchedulerDbContext>();
                        var taskRunner = scope.ServiceProvider.GetRequiredService<TaskRunnerService>();

                        // ✅ 2. ค้นหา Trigger ที่ถึงเวลาทำงานแล้ว (NextExecutionTime <= thaiNow)
                        var dueTriggers = context.Schedules
                            .Where(t => t.IsActive && t.NextExecutionTime <= thaiNow)
                            .ToList(); // ดึงมาเป็น List ก่อนเพื่อหลีกเลี่ยง Concurrency ปัญหาของ EF

                        if (dueTriggers.Any())
                        {
                            _logger.LogInformation($"[{thaiNow:HH:mm:ss}] Found {dueTriggers.Count} tasks to run.");

                            foreach (var trigger in dueTriggers)
                            {
                                // รันงานและคำนวณรอบถัดไป
                                await taskRunner.RunTask(trigger.Id);
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in SchedulerWorker");
                }

                // รอ 10 วินาทีก่อนเช็คใหม่
                await Task.Delay(10000, stoppingToken);
            }
        }
    }
}