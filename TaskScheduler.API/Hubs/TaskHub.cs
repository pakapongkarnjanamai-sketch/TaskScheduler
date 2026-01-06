using Microsoft.AspNetCore.SignalR;

namespace TaskScheduler.API.Hubs
{
    public class TaskHub : Hub
    {
        // คลาสนี้เอาไว้สำหรับ Client Connect เข้ามา
        // เราสามารถเพิ่ม method ได้ถ้า Client ต้องการส่งข้อมูลกลับมา
    }
}