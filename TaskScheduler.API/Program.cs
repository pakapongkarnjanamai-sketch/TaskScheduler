using Microsoft.EntityFrameworkCore;
using TaskScheduler.API.Services; // เพิ่ม
using TaskScheduler.API.Workers;  // เพิ่ม
using TaskScheduler.Data;
using TaskScheduler.Data.Services;

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

// ✅ เพิ่ม Background Service (Scheduler)
builder.Services.AddHostedService<SchedulerWorker>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();