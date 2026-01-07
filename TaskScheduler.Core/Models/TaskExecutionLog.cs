using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TaskScheduler.Core.Models
{
    public class TaskExecutionLog : BaseEntity
    {
        public int TaskId { get; set; }

        // ✅ เพิ่ม: เพื่อระบุว่า Log นี้มาจากการรันของ Trigger ตัวไหน
        public int TriggerId { get; set; }

        // ✅ ปรับ: ใช้ StartTime เพื่อให้สื่อความหมายชัดเจนคู่กับ EndTime
        public DateTime StartTime { get; set; }

        // ✅ เพิ่ม: เวลาที่จบการทำงาน
        public DateTime? EndTime { get; set; }

        public string Status { get; set; } = string.Empty;

        // ✅ เพิ่ม: เก็บข้อความตอบกลับหรือ Error แบบรวม
        public string? ResponseMessage { get; set; }

        // ฟิลด์เดิม (ผม Comment ไว้ให้เลือก ถ้าไม่ได้ใช้แล้วสามารถลบออกได้เลยครับ)
        // public int? ResponseCode { get; set; }
        // public string? ResponseBody { get; set; }
        // public string? ErrorMessage { get; set; }
        // public int? Duration { get; set; } // สามารถคำนวณจาก EndTime - StartTime ได้

        public Task Task { get; set; } = null!;
    }
}