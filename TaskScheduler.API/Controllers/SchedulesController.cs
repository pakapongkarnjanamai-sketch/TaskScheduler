using DevExtreme.AspNet.Data;
using DevExtreme.AspNet.Mvc;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using TaskScheduler.Core.Models;
using TaskScheduler.Data;

namespace TaskScheduler.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SchedulesController : Controller
    {
        private readonly TaskSchedulerDbContext _context;

        public SchedulesController(TaskSchedulerDbContext context)
        {
            _context = context;
        }

        [HttpGet("Get")]
        public async System.Threading.Tasks.Task<object> Get(DataSourceLoadOptions loadOptions)
        {
            var schedules = _context.Schedules.Select(i => new
            {
                i.Id,
                i.TaskId,
                i.TriggerType,
                i.IntervalTime,
                i.StartTime,
                i.IsActive,
                i.Name,
                i.Description,
                i.NextExecutionTime // เพิ่ม field นี้เผื่อต้องการดูเวลาที่คำนวณได้
            });

            return await DataSourceLoader.LoadAsync(schedules, loadOptions);
        }

        [HttpPost("Post")]
        public async System.Threading.Tasks.Task<IActionResult> Post([FromForm] string values)
        {
            var model = new Schedule();
            var valuesDict = JsonConvert.DeserializeObject<IDictionary<string, object>>(values);

            PopulateModel(model, valuesDict);

            if (!TryValidateModel(model))
                return BadRequest(GetFullErrorMessage(ModelState));

            // คำนวณเวลา Next Run ก่อนบันทึก
            CalculateNextRun(model);

            var result = _context.Schedules.Add(model);
            await _context.SaveChangesAsync();

            return Json(new { result.Entity.Id });
        }

        [HttpPut("Put")]
        public async System.Threading.Tasks.Task<IActionResult> Put([FromForm] int key, [FromForm] string values)
        {
            var model = await _context.Schedules.FirstOrDefaultAsync(item => item.Id == key);
            if (model == null)
                return StatusCode(409, "Object not found");

            var valuesDict = JsonConvert.DeserializeObject<IDictionary<string, object>>(values);

            PopulateModel(model, valuesDict);

            if (!TryValidateModel(model))
                return BadRequest(GetFullErrorMessage(ModelState));

            // คำนวณเวลา Next Run ใหม่เมื่อมีการแก้ไข
            CalculateNextRun(model);

            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpDelete("Delete")]
        public async System.Threading.Tasks.Task<IActionResult> Delete([FromForm] int key)
        {
            var model = await _context.Schedules.FirstOrDefaultAsync(item => item.Id == key);
            if (model != null)
            {
                _context.Schedules.Remove(model);
                await _context.SaveChangesAsync();
            }
            return Ok();
        }

        // 🟢 Logic คำนวณเวลา Next Run (ตามที่คุณต้องการ)
        private void CalculateNextRun(Schedule trigger)
        {
            // ใช้เวลาปัจจุบัน UTC+7
            var now = DateTime.UtcNow.AddHours(7);

            // ตัดวินาทีและมิลลิวินาทีทิ้ง ให้เหลือแค่ระดับนาที
            var nowMinute = new DateTime(now.Year, now.Month, now.Day, now.Hour, now.Minute, 0);

            if (trigger.TriggerType == "Interval" && trigger.IntervalTime > 0)
            {
                // บวกนาทีจากเวลาปัจจุบันที่ตัดวินาทีแล้ว
                trigger.NextExecutionTime = nowMinute.AddMinutes(trigger.IntervalTime.Value);
            }
            else if (trigger.TriggerType == "Daily" && trigger.StartTime.HasValue)
            {
                // ตัดวินาทีออกจาก StartTime ของ Trigger ด้วย
                var start = trigger.StartTime.Value;
                var startClean = new TimeSpan(start.Hours, start.Minutes, 0);

                var todayRun = nowMinute.Date.Add(startClean);

                // ถ้าเวลาที่ตั้งไว้ ผ่านไปแล้วของวันนี้ ให้ตั้งเป็นพรุ่งนี้
                trigger.NextExecutionTime = (todayRun > nowMinute) ? todayRun : todayRun.AddDays(1);
            }
        }

        private void PopulateModel(Schedule model, IDictionary<string, object> values)
        {
            string ID = nameof(Schedule.Id);
            string NAME = nameof(Schedule.Name);
            string DESCRIPTION = nameof(Schedule.Description);
            string IS_ACTIVE = nameof(Schedule.IsActive);
            string TRIGGER_TYPE = nameof(Schedule.TriggerType);
            string INTERVAL_TIME = nameof(Schedule.IntervalTime);
            string START_TIME = nameof(Schedule.StartTime);
            string TASK_ID = nameof(Schedule.TaskId);

            if (values.ContainsKey(ID))
            {
                model.Id = Convert.ToInt32(values[ID]);
            }

            if (values.ContainsKey(NAME))
            {
                model.Name = Convert.ToString(values[NAME]);
            }

            if (values.ContainsKey(DESCRIPTION))
            {
                model.Description = Convert.ToString(values[DESCRIPTION]);
            }

            if (values.ContainsKey(IS_ACTIVE))
            {
                model.IsActive = Convert.ToBoolean(values[IS_ACTIVE]);
            }

            if (values.ContainsKey(TRIGGER_TYPE))
            {
                model.TriggerType = Convert.ToString(values[TRIGGER_TYPE]);
            }

            if (values.ContainsKey(INTERVAL_TIME))
            {
                model.IntervalTime = values[INTERVAL_TIME] != null ? Convert.ToInt32(values[INTERVAL_TIME]) : (int?)null;
            }

            if (values.ContainsKey(START_TIME))
            {
                // รับค่า DateTime String มาแปลง แล้วดึงเฉพาะ TimeOfDay
                if (values[START_TIME] != null && DateTime.TryParse(Convert.ToString(values[START_TIME]), out DateTime dt))
                {
                    model.StartTime = dt.TimeOfDay;
                }
                else
                {
                    model.StartTime = null;
                }
            }

            if (values.ContainsKey(TASK_ID))
            {
                model.TaskId = Convert.ToInt32(values[TASK_ID]);
            }
        }

        private string GetFullErrorMessage(Microsoft.AspNetCore.Mvc.ModelBinding.ModelStateDictionary modelState)
        {
            var messages = new List<string>();

            foreach (var entry in modelState)
            {
                foreach (var error in entry.Value.Errors)
                {
                    messages.Add(error.ErrorMessage);
                }
            }

            return String.Join(" ", messages);
        }
    }
}