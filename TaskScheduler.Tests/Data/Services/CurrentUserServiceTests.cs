using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using TaskScheduler.Data.Services;

namespace TaskScheduler.Tests.Data.Services;

public class CurrentUserServiceTests
{
    [Fact]
    public void UserId_WhenUserIsUnauthenticated_ReturnsSystem()
    {
        var accessor = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext()
        };

        var service = new CurrentUserService(accessor);

        Assert.Equal("SYSTEM", service.UserId);
        Assert.Equal("SYSTEM", service.FullName);
        Assert.False(service.IsAuthenticated);
    }

    [Fact]
    public void UserId_WhenWindowsIdentityContainsDomain_StripsDomainPrefix()
    {
        var identity = new ClaimsIdentity(
        [
            new Claim(ClaimTypes.Name, "NIKONOA\\N4734")
        ],
        authenticationType: "Windows");

        var accessor = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(identity)
            }
        };

        var service = new CurrentUserService(accessor);

        Assert.Equal("N4734", service.UserId);
        Assert.Equal("NIKONOA\\N4734", service.FullName);
        Assert.True(service.IsAuthenticated);
    }
}