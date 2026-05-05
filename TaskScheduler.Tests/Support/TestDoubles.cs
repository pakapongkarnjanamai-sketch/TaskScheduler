using System.Globalization;
using System.Net.Http;
using Microsoft.AspNetCore.SignalR;
using TaskScheduler.API.Hubs;
using TaskScheduler.Data.Services;

namespace TaskScheduler.Tests.Support;

internal sealed class FixedDateTime : IDateTime
{
    public FixedDateTime(DateTime now)
    {
        Now = now;
    }

    public DateTime Now { get; set; }

    public CultureInfo CultureInfo { get; } = new("th-TH");

    public DateTime UnixTime { get; } = new(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
}

internal sealed class FakeCurrentUserService : ICurrentUserService
{
    public string UserId { get; set; } = "TESTER";

    public string FullName { get; set; } = "DOMAIN\\TESTER";

    public bool IsAuthenticated { get; set; } = true;
}

internal sealed class StubHttpClientFactory : IHttpClientFactory
{
    private readonly HttpClient _client;

    public StubHttpClientFactory(HttpClient client)
    {
        _client = client;
    }

    public HttpClient CreateClient(string name)
    {
        return _client;
    }
}

internal sealed class StubHttpMessageHandler : HttpMessageHandler
{
    private readonly Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> _handler;

    public StubHttpMessageHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> handler)
    {
        _handler = handler;
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return _handler(request, cancellationToken);
    }
}

internal sealed class RecordingClientProxy : IClientProxy
{
    public List<(string Method, object?[] Args)> Invocations { get; } = new();

    public Task SendCoreAsync(string method, object?[] args, CancellationToken cancellationToken = default)
    {
        Invocations.Add((method, args));
        return Task.CompletedTask;
    }
}

internal sealed class RecordingHubClients : IHubClients
{
    private readonly RecordingClientProxy _proxy;

    public RecordingHubClients(RecordingClientProxy proxy)
    {
        _proxy = proxy;
    }

    public IClientProxy All => _proxy;

    public IClientProxy AllExcept(IReadOnlyList<string> excludedConnectionIds)
    {
        return _proxy;
    }

    public IClientProxy Client(string connectionId)
    {
        return _proxy;
    }

    public IClientProxy Clients(IReadOnlyList<string> connectionIds)
    {
        return _proxy;
    }

    public IClientProxy Group(string groupName)
    {
        return _proxy;
    }

    public IClientProxy GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds)
    {
        return _proxy;
    }

    public IClientProxy Groups(IReadOnlyList<string> groupNames)
    {
        return _proxy;
    }

    public IClientProxy User(string userId)
    {
        return _proxy;
    }

    public IClientProxy Users(IReadOnlyList<string> userIds)
    {
        return _proxy;
    }
}

internal sealed class RecordingGroupManager : IGroupManager
{
    public Task AddToGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }

    public Task RemoveFromGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }
}

internal sealed class RecordingTaskHubContext : IHubContext<TaskHub>
{
    public RecordingTaskHubContext()
    {
        Proxy = new RecordingClientProxy();
        Clients = new RecordingHubClients(Proxy);
    }

    public RecordingClientProxy Proxy { get; }

    public IHubClients Clients { get; }

    public IGroupManager Groups { get; } = new RecordingGroupManager();
}