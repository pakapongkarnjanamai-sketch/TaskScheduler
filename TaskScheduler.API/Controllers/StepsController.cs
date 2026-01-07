using DevExtreme.AspNet.Data;
using DevExtreme.AspNet.Mvc;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json; // จำเป็นสำหรับการแปลงข้อมูลจาก DevExtreme
using TaskScheduler.Core.Models;
using TaskScheduler.Data;

namespace TaskScheduler.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StepsController : ControllerBase
    {
        private readonly TaskSchedulerDbContext _context;

        public StepsController(TaskSchedulerDbContext context)
        {
            _context = context;
        }

        // GET: api/Steps/Get
        [HttpGet("Get")]
        public async Task<object> Get(DataSourceLoadOptions loadOptions)
        {
            // ใช้ DataSourceLoader เพื่อรองรับการ Filter, Sort, Page จาก Frontend โดยอัตโนมัติ
            // Frontend จะส่ง Filter TaskId มาให้เองผ่าน loadOptions
            return DataSourceLoader.Load(_context.Steps, loadOptions);
        }

        // POST: api/Steps/Post
        [HttpPost("Post")]
        public async Task<IActionResult> Post([FromForm] string values)
        {
            var newStep = new Step();

            // แปลง JSON string เป็น Object
            JsonConvert.PopulateObject(values, newStep);

            if (!TryValidateModel(newStep))
                return BadRequest(ModelState);

            _context.Steps.Add(newStep);
            await _context.SaveChangesAsync();

            return Ok(newStep);
        }

        // PUT: api/Steps/Put
        [HttpPut("Put")]
        public async Task<IActionResult> Put([FromForm] int key, [FromForm] string values)
        {
            var step = await _context.Steps.FindAsync(key);
            if (step == null)
                return StatusCode(409, "Step not found");

            // อัปเดตข้อมูลเฉพาะ field ที่มีการเปลี่ยนแปลง
            JsonConvert.PopulateObject(values, step);

            if (!TryValidateModel(step))
                return BadRequest(ModelState);

            await _context.SaveChangesAsync();

            return Ok(step);
        }

        // DELETE: api/Steps/Delete
        [HttpDelete("Delete")]
        public async Task<IActionResult> Delete([FromForm] int key)
        {
            var step = await _context.Steps.FindAsync(key);
            if (step == null)
                return StatusCode(409, "Step not found");

            _context.Steps.Remove(step);
            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}