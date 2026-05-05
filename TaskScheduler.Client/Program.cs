using TaskScheduler.Client.Options;
using TaskScheduler.Client.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services
    .AddOptions<TaskSchedulerApiOptions>()
    .Bind(builder.Configuration.GetSection(TaskSchedulerApiOptions.SectionName))
    .Validate(options => Uri.TryCreate(options.BaseUrl, UriKind.Absolute, out _), "TaskSchedulerApi:BaseUrl must be an absolute URL.")
    .ValidateOnStart();

builder.Services.AddSingleton<HomePageViewModelFactory>();

builder.Services.AddControllersWithViews()
    .AddNewtonsoftJson(options => options.SerializerSettings.ContractResolver = new Newtonsoft.Json.Serialization.DefaultContractResolver());

builder.Services.AddRazorPages();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles(); // สำคัญสำหรับ DevExtreme Scripts/Styles
app.UseRouting();
app.UseAuthorization();

app.MapStaticAssets();
app.MapRazorPages().WithStaticAssets();

// เพิ่ม Default Route สำหรับ Controller
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();