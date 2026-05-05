using Microsoft.AspNetCore.Mvc;
using TaskScheduler.Client.Services;

namespace TaskScheduler.Client.Controllers
{
    public class HomeController : Controller
    {
        private readonly HomePageViewModelFactory _homePageViewModelFactory;

        public HomeController(HomePageViewModelFactory homePageViewModelFactory)
        {
            _homePageViewModelFactory = homePageViewModelFactory;
        }

        // เปิดหน้าเว็บ (View)
        public IActionResult Index()
        {
            return View(_homePageViewModelFactory.Create());
        }

    
    }
}