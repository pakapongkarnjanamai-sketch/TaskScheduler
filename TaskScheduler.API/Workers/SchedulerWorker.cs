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
                        var scheduleDispatchService = scope.ServiceProvider.GetRequiredService<ScheduledTaskDispatchService>();
                        await scheduleDispatchService.RunDueSchedulesAsync(stoppingToken);
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