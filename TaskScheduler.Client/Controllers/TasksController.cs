using DevExtreme.AspNet.Data;
using DevExtreme.AspNet.Mvc;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using System.Text;
using TaskScheduler.Core.Models;

namespace TaskScheduler.Client.Controllers
{
    public class TasksController : Controller
    {
        private readonly IHttpClientFactory _clientFactory;

        public TasksController(IHttpClientFactory clientFactory)
        {
            _clientFactory = clientFactory;
        }

        // เปิดหน้าเว็บ (View)
        public IActionResult Index()
        {
            return View();
        }

        // READ: ดึงข้อมูล (Proxy -> API)
        [HttpGet]
        public async Task<object> Get(DataSourceLoadOptions loadOptions)
        {
            var client = _clientFactory.CreateClient("TaskApi");

            // เรียก API Backend (ตรวจสอบว่า Backend รันอยู่และ Port ถูกต้อง)
            var response = await client.GetAsync("api/tasks");
            if (!response.IsSuccessStatusCode)
                return BadRequest("Could not retrieve tasks from API.");

            var json = await response.Content.ReadAsStringAsync();
            var tasks = JsonConvert.DeserializeObject<List<ScheduledTask>>(json) ?? new List<ScheduledTask>();

            // ให้ DevExtreme จัดการ Sort/Filter/Page
            return DataSourceLoader.Load(tasks, loadOptions);
        }

        // CREATE: สร้างงานใหม่
        [HttpPost]
        public async Task<IActionResult> Post(string values)
        {
            var newTask = new ScheduledTask();
            JsonConvert.PopulateObject(values, newTask); // แปลง JSON จากหน้าเว็บเป็น Object

            if (!TryValidateModel(newTask))
                return BadRequest(ModelState);

            var client = _clientFactory.CreateClient("TaskApi");
            var content = new StringContent(JsonConvert.SerializeObject(newTask), Encoding.UTF8, "application/json");

            var response = await client.PostAsync("api/tasks", content);
            if (!response.IsSuccessStatusCode)
                return BadRequest(await response.Content.ReadAsStringAsync());

            return Ok();
        }

        // UPDATE: แก้ไขงาน
        [HttpPut]
        public async Task<IActionResult> Put(int key, string values)
        {
            var client = _clientFactory.CreateClient("TaskApi");

            // 1. ดึงข้อมูลเก่ามาก่อน
            var getResponse = await client.GetAsync($"api/tasks/{key}");
            if (!getResponse.IsSuccessStatusCode) return NotFound();

            var oldJson = await getResponse.Content.ReadAsStringAsync();
            var task = JsonConvert.DeserializeObject<ScheduledTask>(oldJson);

            // 2. เอาค่าใหม่ทับค่าเก่า
            JsonConvert.PopulateObject(values, task);

            // 3. ส่งกลับไปบันทึก
            var content = new StringContent(JsonConvert.SerializeObject(task), Encoding.UTF8, "application/json");
            var response = await client.PutAsync($"api/tasks/{key}", content);

            if (!response.IsSuccessStatusCode)
                return BadRequest(await response.Content.ReadAsStringAsync());

            return Ok();
        }

        // DELETE: ลบงาน
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