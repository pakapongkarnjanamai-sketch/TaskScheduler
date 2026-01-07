using DevExtreme.AspNet.Data;
using DevExtreme.AspNet.Mvc;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore; // อย่าลืม using นี้
using TaskScheduler.Data;

namespace TaskScheduler.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StepExecutionLogsController : ControllerBase
    {
        private readonly TaskSchedulerDbContext _context;

        public StepExecutionLogsController(TaskSchedulerDbContext context)
        {
            _context = context;
        }

        [HttpGet("Get")]
        public object Get(DataSourceLoadOptions loadOptions)
        {
            // เพิ่ม Include เพื่อให้สามารถ Filter "TaskExecutionLog.TaskId" จากหน้าบ้านได้
            var source = _context.StepExecutionLogs
                .Include(x => x.TaskExecutionLog)
                .AsQueryable();

            return DataSourceLoader.Load(source, loadOptions);
        }
    }
}