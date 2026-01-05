using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TaskScheduler.Core.Models
{
    public class TaskExecutionLog : BaseEntity
    {
        public int TaskId { get; set; }
        public DateTime ExecutedAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? ResponseCode { get; set; }
        public string? ResponseBody { get; set; }
        public string? ErrorMessage { get; set; }
        public int? Duration { get; set; }
        public ScheduledTask Task { get; set; } = null!;
    }
}
