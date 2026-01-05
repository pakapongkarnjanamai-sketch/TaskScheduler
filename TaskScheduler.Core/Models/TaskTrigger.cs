using System;
using System.ComponentModel.DataAnnotations; // เพิ่ม

namespace TaskScheduler.Core.Models
{
    public class TaskTrigger : BaseEntity
    {
        public int TaskId { get; set; }
        public string TriggerType { get; set; } = string.Empty; // "Interval", "Daily"
        public string? CronExpression { get; set; } // (อาจจะไม่ได้ใช้ถ้าไม่ใช้ Library)
        public int? IntervalMinutes { get; set; } // รันทุกๆ X นาที
        public TimeSpan? StartTime { get; set; }

        // เพิ่มฟิลด์สำหรับจัดการ State
        public DateTime? NextExecutionTime { get; set; }
        public DateTime? LastExecutionTime { get; set; }

        public ScheduledTask Task { get; set; } = null!;
    }
}