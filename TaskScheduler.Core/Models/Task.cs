using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TaskScheduler.Core.Models
{
    public class Task : BaseEntity, ISoftDeletable
    {
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }

        public ICollection<Step> Steps { get; set; } = new List<Step>();
        public ICollection<Schedule> Triggers { get; set; } = new List<Schedule>();
    }
}