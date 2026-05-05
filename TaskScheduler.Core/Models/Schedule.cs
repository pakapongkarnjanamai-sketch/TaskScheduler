using System;
using System.ComponentModel.DataAnnotations;

namespace TaskScheduler.Core.Models
{
    public class Schedule : BaseEntity, ISoftDeletable
    {
        public int TaskId { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
        // ประเภท: Interval, Daily, Weekly, Monthly
        [Required]
        public string TriggerType { get; set; } = ScheduleTriggerTypes.Interval;

        public int? IntervalTime { get; set; } // สำหรับแบบ Interval
        public TimeSpan? StartTime { get; set; }  // สำหรับแบบ Daily/Weekly/Monthly
        [MaxLength(64)]
        public string? DaysOfWeek { get; set; }  // Monday,Wednesday สำหรับแบบ Weekly
        public int? DayOfMonth { get; set; }     // 1-31 สำหรับแบบ Monthly

        // ✅ เพิ่มฟิลด์สำคัญ (ต้องมีเพื่อให้ Scheduler ทำงานถูก)
        public DateTime? NextExecutionTime { get; set; }
        public DateTime? LastExecutionTime { get; set; }

        public Task? Task { get; set; }
    }
}