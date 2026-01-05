using DevExtreme.AspNet.Data;
using DevExtreme.AspNet.Mvc;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using TaskScheduler.Core.Models;
using System.Text;

namespace TaskScheduler.Client.Controllers
{
    public class TasksController : Controller
    {
        private readonly IHttpClientFactory _clientFactory;

        public TasksController(IHttpClientFactory clientFactory)
        {
            _clientFactory = clientFactory;
        }

        // หน้าจอหลัก (แสดง Grid)
        public IActionResult Index()
        {
            return View();
        }

        // READ: ดึงข้อมูลสำหรับ DevExtreme Grid
        [HttpGet]
        public async Task<object> Get(DataSourceLoadOptions loadOptions)
        {
            var client = _clientFactory.CreateClient("TaskApi");

            // ดึงข้อมูลทั้งหมดจาก API
            var response = await client.GetAsync("api/tasks");
            if (!response.IsSuccessStatusCode)
                return BadRequest("Cannot retrieve tasks from API");

            var json = await response.Content.ReadAsStringAsync();
            var tasks = JsonConvert.DeserializeObject<List<ScheduledTask>>(json) ?? new List<ScheduledTask>();

            // ใช้ DataSourceLoader เพื่อรองรับการ Sort/Filter จาก Grid ฝั่ง Client
            return DataSourceLoader.Load(tasks, loadOptions);
        }

        // CREATE: สร้าง Task ใหม่
        [HttpPost]
        public async Task<IActionResult> Post(string values)
        {
            var newTask = new ScheduledTask();
            JsonConvert.PopulateObject(values, newTask);

            // Validate เบื้องต้น
            if (!TryValidateModel(newTask))
                return BadRequest(ModelState);

            var client = _clientFactory.CreateClient("TaskApi");
            var content = new StringContent(JsonConvert.SerializeObject(newTask), Encoding.UTF8, "application/json");

            var response = await client.PostAsync("api/tasks", content);
            if (!response.IsSuccessStatusCode)
                return BadRequest(await response.Content.ReadAsStringAsync());

            return Ok();
        }

        // UPDATE: แก้ไข Task
        [HttpPut]
        public async Task<IActionResult> Put(int key, string values)
        {
            var client = _clientFactory.CreateClient("TaskApi");

            // 1. ดึงข้อมูลเก่ามาก่อน (เพื่อ Merge ค่าที่แก้)
            var getResponse = await client.GetAsync($"api/tasks/{key}");
            if (!getResponse.IsSuccessStatusCode) return NotFound();

            var oldJson = await getResponse.Content.ReadAsStringAsync();
            var task = JsonConvert.DeserializeObject<ScheduledTask>(oldJson);

            // 2. เอาค่าใหม่ (values) ไปทับค่าเก่า
            JsonConvert.PopulateObject(values, task);

            // 3. ส่งกลับไป Update
            var content = new StringContent(JsonConvert.SerializeObject(task), Encoding.UTF8, "application/json");
            var response = await client.PutAsync($"api/tasks/{key}", content);

            if (!response.IsSuccessStatusCode)
                return BadRequest(await response.Content.ReadAsStringAsync());

            return Ok();
        }

        // DELETE: ลบ Task
        [HttpDelete]
        public async Task<IActionResult> Delete(int key)
        {
            var client = _clientFactory.CreateClient("TaskApi");
            var response = await client.DeleteAsync($"api/tasks/{key}");

            if (!response.IsSuccessStatusCode)
                return BadRequest("Error deleting task");

            return Ok();
        }
    }
}