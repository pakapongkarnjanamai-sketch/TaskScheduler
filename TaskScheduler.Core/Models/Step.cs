using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TaskScheduler.Core.Models
{
    public class Step : BaseEntity
    {
        public int TaskId { get; set; }

        [ForeignKey("TaskId")]
        public Task? Task { get; set; }

        public string Name { get; set; } = string.Empty; // ชื่อขั้นตอน เช่น "Login", "Fetch Data"
        public string? Description { get; set; }
        public int Order { get; set; } = 1; // ลำดับการทำงาน 1, 2, 3...

        public string ApiUrl { get; set; } = string.Empty;
        public string HttpMethod { get; set; } = "GET";
        public string? Headers { get; set; }
        public string? Body { get; set; }
    }
}