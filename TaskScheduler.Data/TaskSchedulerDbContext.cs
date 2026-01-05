using Microsoft.EntityFrameworkCore;
using TaskScheduler.Core.Models;

namespace TaskScheduler.Data
{
    public class TaskSchedulerDbContext : DbContext
    {
        public TaskSchedulerDbContext(DbContextOptions<TaskSchedulerDbContext> options)
            : base(options)
        {
        }

        public DbSet<ScheduledTask> Tasks { get; set; }
        public DbSet<TaskTrigger> TaskTriggers { get; set; }
        public DbSet<TaskExecutionLog> TaskExecutionLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<ScheduledTask>(entity =>
            {
                entity.ToTable("Tasks");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.ApiUrl).IsRequired().HasMaxLength(500);

            });

            modelBuilder.Entity<TaskTrigger>(entity =>
            {
                entity.ToTable("TaskTriggers");
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Task)
                      .WithMany(e => e.Triggers)
                      .HasForeignKey(e => e.TaskId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<TaskExecutionLog>(entity =>
            {
                entity.ToTable("TaskExecutionLogs");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ExecutedAt).HasDefaultValueSql("GETDATE()");
            });
        }
    }
}
