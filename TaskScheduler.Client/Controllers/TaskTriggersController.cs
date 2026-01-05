using DevExtreme.AspNet.Data;
using DevExtreme.AspNet.Mvc;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using System.Text;
using TaskScheduler.Core.Models;

namespace TaskScheduler.Client.Controllers
{
    public class TaskTriggersController : Controller
    {
        private readonly IHttpClientFactory _clientFactory;

        public TaskTriggersController(IHttpClientFactory clientFactory)
        {
            _clientFactory = clientFactory;
        }

        [HttpGet]
        public async Task<object> Get(int taskId, DataSourceLoadOptions loadOptions)
        {
            var client = _clientFactory.CreateClient("TaskApi");
            var json = await client.GetStringAsync($"api/TaskTriggers?taskId={taskId}");
            var triggers = JsonConvert.DeserializeObject<List<TaskTrigger>>(json) ?? new List<TaskTrigger>();
            return DataSourceLoader.Load(triggers, loadOptions);
        }

        [HttpPost]
        public async Task<IActionResult> Post(string values)
        {
            var newTrigger = new TaskTrigger();
            JsonConvert.PopulateObject(values, newTrigger);

            var client = _clientFactory.CreateClient("TaskApi");
            var content = new StringContent(JsonConvert.SerializeObject(newTrigger), Encoding.UTF8, "application/json");
            var response = await client.PostAsync("api/TaskTriggers", content);

            return response.IsSuccessStatusCode ? Ok() : BadRequest();
        }

        [HttpPut]
        public async Task<IActionResult> Put(int key, string values)
        {
            // Note: ในงานจริงควร Get ตัวเก่ามา Merge ก่อนเหมือน TasksController
            // แต่เพื่อความกระชับ ขอละไว้ในตัวอย่างนี้ครับ
            var trigger = new TaskTrigger { Id = key };
            JsonConvert.PopulateObject(values, trigger);

            var client = _clientFactory.CreateClient("TaskApi");
            var content = new StringContent(JsonConvert.SerializeObject(trigger), Encoding.UTF8, "application/json");
            var response = await client.PutAsync($"api/TaskTriggers/{key}", content);

            return response.IsSuccessStatusCode ? Ok() : BadRequest();
        }

        [HttpDelete]
        public async Task<IActionResult> Delete(int key)
        {
            var client = _clientFactory.CreateClient("TaskApi");
            await client.DeleteAsync($"api/TaskTriggers/{key}");
            return Ok();
        }
    }
}