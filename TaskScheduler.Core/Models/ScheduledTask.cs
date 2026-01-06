using System.Collections.Generic;

namespace TaskScheduler.Core.Models
{
    public class ScheduledTask : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }

        public ICollection<TaskStep> Steps { get; set; } = new List<TaskStep>();
        public ICollection<TaskTrigger> Triggers { get; set; } = new List<TaskTrigger>();
    }
}