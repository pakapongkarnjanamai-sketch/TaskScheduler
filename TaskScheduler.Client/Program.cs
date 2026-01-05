var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews()
    .AddNewtonsoftJson(options => options.SerializerSettings.ContractResolver = new Newtonsoft.Json.Serialization.DefaultContractResolver());

builder.Services.AddRazorPages();

// ✅ ลงทะเบียน HttpClient สำหรับเรียก Backend API
// ตรวจสอบ Port 5070 จากไฟล์ launchSettings.json ของโปรเจกต์ API
builder.Services.AddHttpClient("TaskApi", client =>
{
    client.BaseAddress = new Uri("https://localhost:7253/");
});

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
    pattern: "{controller=Tasks}/{action=Index}/{id?}");

app.Run();