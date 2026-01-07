using System.Collections.Generic;

namespace TaskScheduler.Core.Models
{
    public class Task : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }

        public ICollection<Step> Steps { get; set; } = new List<Step>();
        public ICollection<Schedule> Triggers { get; set; } = new List<Schedule>();
    }
}