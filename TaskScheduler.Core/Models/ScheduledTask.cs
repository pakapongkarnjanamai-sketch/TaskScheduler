using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TaskScheduler.Core.Models
{
    public class ScheduledTask : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string ApiUrl { get; set; } = string.Empty;
        public string HttpMethod { get; set; } = "GET";
        public string? Headers { get; set; }
        public string? Body { get; set; }

        public ICollection<TaskTrigger> Triggers { get; set; } = new List<TaskTrigger>();
    }
}
