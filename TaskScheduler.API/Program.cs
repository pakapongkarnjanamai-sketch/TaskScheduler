using System.Net;
using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.EntityFrameworkCore;
using TaskScheduler.API.Services; 
using TaskScheduler.API.Workers;  
using TaskScheduler.Data;
using TaskScheduler.Data.Services;
using TaskScheduler.API.Hubs;
var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddAuthentication(NegotiateDefaults.AuthenticationScheme)
    .AddNegotiate();

builder.Services.AddAuthorization();

builder.Services.AddDbContext<TaskSchedulerDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHttpClient();

builder.Services.AddHttpContextAccessor();
builder.Services.AddTransient<IDateTime, DateTimeService>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();


builder.Services.AddScoped<TaskRunnerService>();
builder.Services.AddScoped<TaskAdminService>();
builder.Services.AddScoped<StepAdminService>();
builder.Services.AddScoped<StepRequestTestService>();
builder.Services.AddScoped<ScheduleAdminService>();
builder.Services.AddScoped<ScheduleTimingService>();
builder.Services.AddScoped<ScheduledTaskDispatchService>();
builder.Services.AddScoped<ExecutionLogQueryService>();
builder.Services.AddSignalR()
    .AddJsonProtocol(options => {
        options.PayloadSerializerOptions.PropertyNamingPolicy = null;
    });

builder.Services.AddHostedService<SchedulerWorker>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(origin => IsAllowedClientOrigin(origin, builder.Environment.IsDevelopment()))
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
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers().RequireCors("AllowAll").RequireAuthorization();
app.MapHub<TaskHub>("/taskHub").RequireCors("AllowAll").RequireAuthorization();
app.Run();

static bool IsAllowedClientOrigin(string origin, bool allowLoopbackDevOrigins)
{
    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
    {
        return false;
    }

    if (string.Equals(origin, "https://localhost:7259", StringComparison.OrdinalIgnoreCase))
    {
        return true;
    }

    if (!allowLoopbackDevOrigins)
    {
        return false;
    }

    if (!string.Equals(uri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
        && !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
    {
        return false;
    }

    return string.Equals(uri.Host, "localhost", StringComparison.OrdinalIgnoreCase)
        || (IPAddress.TryParse(uri.Host, out var address) && IPAddress.IsLoopback(address));
}