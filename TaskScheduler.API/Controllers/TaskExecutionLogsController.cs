using DevExtreme.AspNet.Data;
using DevExtreme.AspNet.Mvc;
using Microsoft.AspNetCore.Mvc;
using TaskScheduler.Data;

namespace TaskScheduler.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TaskExecutionLogsController : ControllerBase
    {
        private readonly TaskSchedulerDbContext _context;

        public TaskExecutionLogsController(TaskSchedulerDbContext context)
        {
            _context = context;
        }

        // GET: api/TaskExecutionLogs/Get
        [HttpGet("Get")]
        public async Task<object> Get(DataSourceLoadOptions loadOptions)
        {
            // ดึงข้อมูล Logs ทั้งหมด
            // การ Filter ว่าจะเอา Log ของ TaskId ไหน จะถูกจัดการโดยอัตโนมัติ
            // ผ่าน loadOptions ที่ส่งมาจาก Frontend (ในส่วน filter: ["TaskId", "=", taskId])

            var logsQuery = _context.TaskExecutionLogs
                                    .OrderByDescending(l => l.StartTime); // เรียงจากล่าสุดไปเก่าสุด

            return DataSourceLoader.Load(logsQuery, loadOptions);
        }
    }
}