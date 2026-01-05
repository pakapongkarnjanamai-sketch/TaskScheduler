using Microsoft.AspNetCore.Mvc;

namespace TaskScheduler.Client.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
       
    }
}
