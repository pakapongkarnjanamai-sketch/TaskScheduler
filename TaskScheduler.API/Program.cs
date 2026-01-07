using Microsoft.EntityFrameworkCore;
using TaskScheduler.API.Services; // เพิ่ม
using TaskScheduler.API.Workers;  // เพิ่ม
using TaskScheduler.Data;
using TaskScheduler.Data.Services;
using TaskScheduler.API.Hubs;
var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<TaskSchedulerDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// HTTP Client
builder.Services.AddHttpClient();

// Services
builder.Services.AddHttpContextAccessor();
builder.Services.AddTransient<IDateTime, DateTimeService>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

// ✅ เพิ่ม Service สำหรับรัน Task
builder.Services.AddScoped<TaskRunnerService>();
builder.Services.AddSignalR()
    .AddJsonProtocol(options => {
        options.PayloadSerializerOptions.PropertyNamingPolicy = null;
    });
// ✅ เพิ่ม Background Service (Scheduler)
builder.Services.AddHostedService<SchedulerWorker>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins("https://localhost:7259") // อ่านจาก Config
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});
builder.Services.AddControllers().AddJsonOptions(options => options.JsonSerializerOptions.PropertyNamingPolicy = null);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors("AllowAll");
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.MapHub<TaskHub>("/taskHub");
app.Run();