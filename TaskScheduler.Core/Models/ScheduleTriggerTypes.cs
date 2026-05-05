namespace TaskScheduler.Core.Models;

public static class ScheduleTriggerTypes
{
    public const string Interval = "Interval";
    public const string Daily = "Daily";
    public const string Weekly = "Weekly";
    public const string Monthly = "Monthly";

    public static readonly string[] All = [Interval, Daily, Weekly, Monthly];
}