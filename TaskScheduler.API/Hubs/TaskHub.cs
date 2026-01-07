using Microsoft.AspNetCore.SignalR;

namespace TaskScheduler.API.Hubs
{
    public class TaskHub : Hub
    {
        public async Task SendUpdate(string message)
        {
            await Clients.All.SendAsync("ReceiveTaskUpdate", message);
        }
    }
}