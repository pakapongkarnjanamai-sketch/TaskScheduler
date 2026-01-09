using DevExtreme.AspNet.Data;
using DevExtreme.AspNet.Mvc;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using System.Text;
using TaskScheduler.Core.Models;

namespace TaskScheduler.Client.Controllers
{
    public class HomeController : Controller
    {

        public HomeController()
        {
        
        }

        // เปิดหน้าเว็บ (View)
        public IActionResult Index()
        {
            return View();
        }

    
    }
}