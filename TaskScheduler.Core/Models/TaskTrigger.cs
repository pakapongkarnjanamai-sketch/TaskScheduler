using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TaskScheduler.Core.Models
{
    public class TaskTrigger : BaseEntity
    {
     
        public int TaskId { get; set; }
        public string TriggerType { get; set; } = string.Empty;
        public string? CronExpression { get; set; }
        public int? IntervalMinutes { get; set; }
        public TimeSpan? StartTime { get; set; }
 
        public ScheduledTask Task { get; set; } = null!;
    }
}
