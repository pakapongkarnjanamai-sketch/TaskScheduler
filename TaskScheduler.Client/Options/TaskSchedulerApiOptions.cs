namespace TaskScheduler.Client.Options;

public sealed class TaskSchedulerApiOptions
{
    public const string SectionName = "TaskSchedulerApi";

    public string BaseUrl { get; set; } = string.Empty;
}