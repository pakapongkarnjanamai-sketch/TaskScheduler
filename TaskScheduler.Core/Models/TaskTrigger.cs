using System;
using System.ComponentModel.DataAnnotations;

namespace TaskScheduler.Core.Models
{
    public class TaskTrigger : BaseEntity
    {
        public int TaskId { get; set; }

        // ประเภท: "Interval" (วนซ้ำตามนาที), "Daily" (รันทุกวันตามเวลา)
        [Required]
        public string TriggerType { get; set; } = "Interval";

        public int? IntervalTime { get; set; } // สำหรับแบบ Interval
        public TimeSpan? StartTime { get; set; }  // สำหรับแบบ Daily

        // ✅ เพิ่มฟิลด์สำคัญ (ต้องมีเพื่อให้ Scheduler ทำงานถูก)
        public DateTime? NextExecutionTime { get; set; }
        public DateTime? LastExecutionTime { get; set; }

        public ScheduledTask? Task { get; set; }
    }
}