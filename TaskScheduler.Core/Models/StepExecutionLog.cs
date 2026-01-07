using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace TaskScheduler.Core.Models
{
    public class StepExecutionLog : BaseEntity
    {
        // ผูกกับ Log หลักของการรันรอบนั้น
        public int TaskExecutionLogId { get; set; }

        [ForeignKey("TaskExecutionLogId")]
        public TaskExecutionLog? TaskExecutionLog { get; set; }

        public string StepName { get; set; } = string.Empty;
        public int Order { get; set; }

        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }

        public string Status { get; set; } = string.Empty; // Success, Failed
        public string? ResponseMessage { get; set; } // ผลลัพธ์ของ Step นั้นๆ
    }
}